import uuid
import logging
import base64
import html
import re

from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.projects.models import MarketingCampaign, MarketingContentItem, ProjectDraft, ProjectRepository
from apps.roadmaps.models import ProjectTask
from .idea_views import authorized_project_drafts
from .cloudflare_ai_service import (
    CloudflareConfigurationError,
    CloudflareRequestError,
    generate_cloudflare_image_with_retry,
)
from .gemini_service import GeminiConfigurationError, GeminiRequestError, generate_marketing_content

logger = logging.getLogger(__name__)


CREATIVE_STYLES = (
    {'name': 'editorial', 'accent': '#D4A574', 'ink': '#FFFDF9', 'panel': '#173B36', 'panel_opacity': '0.78'},
    {'name': 'bold promotional', 'accent': '#F16B61', 'ink': '#FFFDF9', 'panel': '#2B2523', 'panel_opacity': '0.86'},
    {'name': 'modern minimal', 'accent': '#F6D7C8', 'ink': '#2B2523', 'panel': '#FFF8F3', 'panel_opacity': '0.92'},
)


def _creative_dimensions(inputs):
    value = f'{inputs.get("platform", "")} {inputs.get("creative_format", "")} {inputs.get("format", "")}'.lower()
    if any(term in value for term in ('story', 'reel', 'vertical')):
        return 1080, 1920
    if any(term in value for term in ('banner', 'website', 'landscape')):
        return 1600, 700
    if 'facebook' in value:
        return 1200, 630
    return 1200, 1200


def _wrap_creative_text(value, max_chars, max_lines):
    words = re.sub(r'\s+', ' ', str(value or '').strip()).split(' ')
    lines, current = [], ''
    for word in words:
        candidate = f'{current} {word}'.strip()
        if current and len(candidate) > max_chars:
            lines.append(current)
            current = word
        else:
            current = candidate
    if current:
        lines.append(current)
    return lines[:max_lines]


def _fit_creative_text(value, *, max_chars, max_lines, max_size, min_size, available_height, line_height):
    cleaned = re.sub(r'\s+', ' ', str(value or '').strip())
    if not cleaned:
        return [], min_size
    lines = _wrap_creative_text(cleaned, max_chars, max_lines)
    if len(lines) == max_lines and ' '.join(lines) != cleaned:
        lines[-1] = lines[-1].rstrip(' .,;:') + '…'
    size = min(max_size, int(available_height / max(1, len(lines) * line_height)))
    return lines, max(min_size, size)


def _svg_text(lines, *, x, y, size, fill, weight='500', line_height=1.2, anchor='start', family='Arial, sans-serif'):
    escaped = []
    for index, line in enumerate(lines):
        escaped.append(
            f'<text x="{x}" y="{y + index * size * line_height:.1f}" fill="{fill}" '
            f'font-family="{family}" font-size="{size}" font-weight="{weight}" text-anchor="{anchor}">'
            f'{html.escape(line)}</text>'
        )
    return ''.join(escaped)


def compose_marketing_creative(background_bytes, mime_type, *, copy_item, inputs, style_index):
    """Create a deterministic marketing layout around a clean AI background."""
    width, height = _creative_dimensions(inputs)
    style = CREATIVE_STYLES[style_index % len(CREATIVE_STYLES)]
    background = base64.b64encode(background_bytes).decode('ascii')
    background_mime = mime_type if mime_type.startswith('image/') else 'image/jpeg'
    headline = copy_item.get('hook') or copy_item.get('title') or 'Make the next step easier'
    supporting = copy_item.get('body') or copy_item.get('rationale') or ''
    supporting = re.split(r'(?<=[.!?])\s+', re.sub(r'\s+', ' ', str(supporting).strip()))[0][:180]
    cta = copy_item.get('cta') or 'Learn more'
    brand = inputs.get('brand_name') or inputs.get('topic') or ''
    margin = max(48, int(width * .08))
    content_w = int(width * (.43 if height >= 1200 else .46))
    content_x = margin
    content_y = margin
    content_h = height - (margin * 2)
    if style_index % 3 == 0:  # Editorial: quiet gradient and open photography.
        overlay = f'<linearGradient id="editorialShade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#172522" stop-opacity=".74"/><stop offset=".72" stop-color="#172522" stop-opacity=".08"/><stop offset="1" stop-color="#172522" stop-opacity="0"/></linearGradient>'
        treatment = f'<rect x="0" y="0" width="{width}" height="{height}" fill="url(#editorialShade)"/>'
        accent = f'<rect x="{content_x}" y="{content_y}" width="{max(70, int(width * .08))}" height="8" rx="4" fill="{style["accent"]}"/>'
        text_fill, button_fill, button_text = '#FFFDF9', style['accent'], '#173B36'
    elif style_index % 3 == 1:  # Bold: one deliberate color block, not a full dark card.
        overlay = '<linearGradient id="boldShade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2B2523" stop-opacity=".08"/><stop offset="1" stop-color="#2B2523" stop-opacity=".5"/></linearGradient>'
        treatment = f'<rect x="0" y="{height * .48:.1f}" width="{width}" height="{height * .52:.1f}" fill="url(#boldShade)"/><rect x="0" y="{height * .78:.1f}" width="{width}" height="{height * .22:.1f}" fill="{style["accent"]}" fill-opacity=".92"/>'
        content_y = int(height * .53)
        content_h = int(height * .22)
        content_w = width - (margin * 2)
        accent = f'<circle cx="{content_x + 12}" cy="{content_y}" r="12" fill="{style["accent"]}"/>'
        text_fill, button_fill, button_text = '#FFFDF9', '#2B2523', '#FFFDF9'
    else:  # Minimal: pale surface with generous whitespace and no dark overlay.
        overlay = '<linearGradient id="minimalShade" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF8F3" stop-opacity=".9"/><stop offset=".62" stop-color="#FFF8F3" stop-opacity=".35"/><stop offset="1" stop-color="#FFF8F3" stop-opacity="0"/></linearGradient>'
        treatment = f'<rect x="{margin * .55:.1f}" y="{margin * .55:.1f}" width="{width * .52:.1f}" height="{height - margin * 1.1:.1f}" rx="36" fill="url(#minimalShade)"/>'
        accent = f'<path d="M{content_x} {content_y + 10}h{max(80, int(width * .1))}" stroke="{style["accent"]}" stroke-width="10" stroke-linecap="round"/>'
        text_fill, button_fill, button_text = '#2B2523', style['accent'], '#2B2523'
    available_text_h = content_h - 24
    title_lines = _wrap_creative_text(brand, 28 if height >= 1200 else 42, 1)
    title_size = max(16, min(24, int(width * .018)))
    title_y = content_y + title_size
    headline_lines, headline_size = _fit_creative_text(
        headline, max_chars=22 if height >= 1200 else 34, max_lines=3,
        max_size=int(width * (.064 if height >= 1200 else .05)), min_size=34 if height >= 1200 else 28,
        available_height=available_text_h * .44, line_height=1.08,
    )
    cta_lines = _wrap_creative_text(cta, 20, 1)
    cta_height = max(48, int(height * .045))
    cta_y = content_y + content_h - cta_height
    cta_w = min(content_w, max(160, len(cta_lines[0]) * max(16, int(width * .018)) * .66 + 44))
    support_lines, support_size = _fit_creative_text(
        supporting, max_chars=42 if height >= 1200 else 68, max_lines=2,
        max_size=int(width * .024), min_size=22 if height >= 1200 else 18,
        available_height=max(1, cta_y - (content_y + title_size + len(headline_lines) * headline_size * 1.08) - max(20, int(height * .018)) * 2),
        line_height=1.3,
    )
    headline_y = title_y + (title_size * 1.7 if title_lines else 0)
    support_y = headline_y + len(headline_lines) * headline_size * 1.08 + max(20, int(height * .018))
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">
<defs>{overlay}</defs>
<image href="data:{background_mime};base64,{background}" x="0" y="0" width="{width}" height="{height}" preserveAspectRatio="xMidYMid slice"/>
{treatment}{accent}
{_svg_text(title_lines, x=content_x, y=title_y, size=title_size, fill=style['accent'], weight='700')}
{_svg_text(headline_lines, x=content_x, y=headline_y, size=headline_size, fill=text_fill, weight='800', line_height=1.08)}
{_svg_text(support_lines, x=content_x, y=support_y, size=support_size, fill=text_fill, line_height=1.3)}
<rect x="{content_x:.1f}" y="{cta_y:.1f}" width="{cta_w:.1f}" height="{cta_height:.1f}" rx="{cta_height / 2:.1f}" fill="{button_fill}"/>
{_svg_text(cta_lines, x=content_x + 22, y=cta_y + cta_height * .64, size=max(16, min(22, int(width * .018))), fill=button_text, weight='700')}
</svg>'''
    return svg.encode('utf-8'), 'image/svg+xml'


def workspace_key(request):
    raw = request.headers.get('X-Marketing-Workspace', '')
    try:
        return str(uuid.UUID(raw))
    except (ValueError, AttributeError, TypeError):
        return ''


def user_projects(request):
    return authorized_project_drafts(request)


def marketing_project_context(project):
    understanding = project.understanding or {}
    try:
        repository = project.repository
    except ProjectRepository.DoesNotExist:
        repository = None
    plan = (project.workflow or {}).get('flight_plan') or {}
    milestones = []
    for milestone in (plan.get('milestones') or [])[:12]:
        milestones.append({
            'milestone': str(milestone.get('title') or '')[:180],
            'status': str(milestone.get('status') or 'planned')[:40],
            'planned_tasks': [str(task.get('title') if isinstance(task, dict) else task)[:180] for task in (milestone.get('tasks') or [])[:12]],
        })
    completed_tasks = list(ProjectTask.objects.filter(project=project, status='completed').values('title', 'milestone')[:30])
    verified_tasks = []
    assessment = project.roadmap_assessments.first()
    if assessment:
        for row in (assessment.task_assessments or {}).values():
            if row.get('status') == 'verified':
                verified_tasks.append({
                    'task': str(row.get('taskTitle') or '')[:180],
                    'evidence': [str(entry.get('text') or '')[:250] for entry in (row.get('evidence') or [])[:3]],
                    'revision': str(row.get('commit_sha') or assessment.commit_sha)[:64],
                })
    technologies = []
    if repository:
        for technology in (repository.detected_technologies or [])[:20]:
            if isinstance(technology, dict):
                technologies.append({'name': str(technology.get('name') or '')[:100], 'evidence': str(technology.get('evidence') or '')[:180]})
            elif isinstance(technology, str):
                technologies.append({'name': technology[:100], 'evidence': 'Listed in connected repository metadata.'})
    return {
        'project_name': str(understanding.get('project_name') or '')[:160],
        'project_type': project.project_type,
        'idea': str(project.idea or '')[:1200],
        'problem': str(understanding.get('problem_statement') or '')[:800],
        'target_audience': str(understanding.get('target_users') or '')[:500],
        'desired_outcome': str(understanding.get('expected_outcome') or '')[:500],
        'technologies': technologies,
        'roadmap': milestones,
        'workspace_marked_completed_tasks': completed_tasks,
        'independently_verified_tasks': verified_tasks[:20],
        'repository': {
            'name': repository.repo_full_name,
            'revision': repository.last_synced_sha,
            'synced_at': repository.last_synced_at.isoformat() if repository.last_synced_at else None,
            'source_evidence_paths': (repository.latest_analysis or {}).get('evidenceFiles', [])[:25],
        } if repository else None,
        'claim_notes': 'Roadmap entries are plans. Workspace-completed task states are user-recorded progress, not independent proof. Only verified tasks include check-backed verification status.',
    }


class MarketingGenerationInput(serializers.Serializer):
    mode = serializers.ChoiceField(choices=['social', 'showcase', 'repurpose', 'campaign', 'tool', 'email', 'launch', 'landing', 'refine'])
    project_id = serializers.UUIDField(required=False, allow_null=True)
    inputs = serializers.DictField()

    def validate_inputs(self, value):
        if len(str(value)) > 12000:
            raise serializers.ValidationError('Marketing inputs are too long.')
        limits = {'topic': 2400, 'objective': 600, 'audience': 600, 'customer_problem': 1200,
                  'value_proposition': 1200, 'desired_next_action': 500, 'recipient_type': 300,
                  'tone': 80, 'length': 80,
                  'keywords': 500, 'cta': 500, 'extra_instructions': 1800, 'context_override': 7000,
                  'source_content': 8000, 'source_title': 240, 'template': 80, 'language': 80,
                  'key_message': 1200, 'source_url': 500, 'platform': 100, 'campaign_platform': 100,
                  'budget': 80, 'brand_voice': 800, 'launch_status': 300, 'measurable_goals': 1000}
        for key, limit in limits.items():
            item = value.get(key, '')
            if not isinstance(item, str) or len(item) > limit:
                raise serializers.ValidationError({key: f'Use text of up to {limit} characters.'})
        if 'formats' in value and (not isinstance(value['formats'], list) or len(value['formats']) > 8 or any(not isinstance(item, str) or len(item) > 80 for item in value['formats'])):
            raise serializers.ValidationError({'formats': 'Choose up to eight valid output formats.'})
        for key in ('channels', 'competitor_links'):
            if key in value and (not isinstance(value[key], list) or len(value[key]) > 8 or any(not isinstance(item, str) or len(item) > 500 for item in value[key])):
                raise serializers.ValidationError({key: 'Provide up to eight text values.'})
        if 'campaign_days' in value and not isinstance(value['campaign_days'], int):
            raise serializers.ValidationError({'campaign_days': 'Campaign duration must be a number of days.'})
        if self.initial_data.get('mode') == 'repurpose' and not value.get('formats'):
            raise serializers.ValidationError({'formats': 'Select at least one output format.'})
        if value.get('campaign_days', 7) not in (7, 14, 30):
            raise serializers.ValidationError({'campaign_days': 'Campaign length must be 7, 14 or 30 days.'})
        return value


class MarketingGenerateView(APIView):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'marketing_ai'

    def post(self, request):
        serializer = MarketingGenerationInput(data=request.data)
        if not serializer.is_valid():
            return Response({'error': 'Check the content request and try again.', 'fields': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
        values = serializer.validated_data
        project = None
        if values.get('project_id'):
            project = get_object_or_404(user_projects(request), pk=values['project_id'])
        context = marketing_project_context(project) if project else None
        if values['inputs'].get('context_override'):
            context = {**(context or {}), 'user_edited_context': values['inputs']['context_override']}
        try:
            result = generate_marketing_content(mode=values['mode'], inputs=values['inputs'], project_context=context)
        except GeminiConfigurationError as error:
            return Response({'error': str(error), 'code': 'gemini_not_configured'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except GeminiRequestError as error:
            return Response({'error': str(error), 'code': 'generation_failed', 'retryable': error.retryable}, status=status.HTTP_502_BAD_GATEWAY)
        except Exception:
            logger.exception('Unexpected marketing generation failure for user %s.', request.user.pk if request.user.is_authenticated else 'anonymous')
            return Response({
                'error': 'Marketing generation failed unexpectedly. No draft was created. Check the backend logs and try again.',
                'code': 'generation_failed',
            }, status=status.HTTP_502_BAD_GATEWAY)
        return Response({'result': result, 'project_context_used': bool(project)}, status=status.HTTP_200_OK)


def _campaign_visibility(request):
    key = workspace_key(request)
    if request.user.is_authenticated:
        visibility = Q(owner=request.user)
        if key:
            visibility |= Q(owner__isnull=True, browser_key=key)
        return MarketingCampaign.objects.filter(visibility).select_related('project')
    return MarketingCampaign.objects.filter(owner__isnull=True, browser_key=key).select_related('project') if key else MarketingCampaign.objects.none()


class MarketingCampaignSerializer(serializers.ModelSerializer):
    project_name = serializers.SerializerMethodField()

    class Meta:
        model = MarketingCampaign
        fields = ['id', 'title', 'content_type', 'platform', 'project', 'project_name', 'brief', 'copy', 'assets', 'selected_asset', 'status', 'created_at', 'updated_at']
        read_only_fields = ['id', 'project', 'project_name', 'created_at', 'updated_at']

    def get_project_name(self, obj):
        return (obj.project.understanding or {}).get('project_name') if obj.project_id else None


class MarketingCampaignGenerateView(APIView):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'marketing_ai'

    def post(self, request):
        mode = request.data.get('mode', 'social')
        inputs = request.data.get('inputs') or {}
        if mode not in {'social', 'showcase', 'campaign', 'launch', 'landing'} or not isinstance(inputs, dict):
            return Response({'error': 'Choose a supported campaign format and provide a brief.'}, status=status.HTTP_400_BAD_REQUEST)
        serializer = MarketingGenerationInput(data={'mode': mode, 'project_id': request.data.get('project_id'), 'inputs': inputs})
        if not serializer.is_valid():
            return Response({'error': 'Check the campaign brief and try again.', 'fields': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
        values = serializer.validated_data
        image_count = inputs.get('image_count', 3)
        if not isinstance(image_count, int) or image_count not in (1, 2, 3):
            return Response({'error': 'Choose one, two or three campaign images.'}, status=status.HTTP_400_BAD_REQUEST)
        project = get_object_or_404(user_projects(request), pk=values['project_id']) if values.get('project_id') else None
        context = marketing_project_context(project) if project else None
        if inputs.get('context_override'):
            context = {**(context or {}), 'user_edited_context': inputs['context_override']}
        saved_paths = []
        try:
            copy_result = generate_marketing_content(mode=mode, inputs=inputs, project_context=context)
            copy_item = (copy_result.get('items') or [{}])[0]
            format_name = str(inputs.get('creative_format') or inputs.get('platform') or 'marketing campaign')[:80]
            context_data = context if isinstance(context, dict) else {}
            project_subject = (
                str(inputs.get('topic') or '').strip()
                or str(context_data.get('project_name') or '').strip()
                or str(context_data.get('description') or '').strip()
                or 'the product or service described in this brief'
            )[:500]
            verified_context = str(context_data.get('verified_features') or context_data.get('description') or '')[:1200]
            image_prompts = [
                f'Create a commercial advertising background for a {format_name}. '
                f'The primary subject must clearly represent this product or service: {project_subject}. '
                f'Audience: {inputs.get("audience", "")}. Verified context: {verified_context}. '
                f'Customer problem: {inputs.get("customer_problem", "")}. Value proposition: {inputs.get("value_proposition", "")}. '
                'Editorial direction: strong focal subject on the right, generous clean negative space on the left for typography, '
                'warm cream/coral/sage palette, polished studio lighting, realistic materials, refined commercial photography. '
                'Background only: generate no text, letters, numbers, logos, watermarks, signage, labels, UI, or fake claims.',
                f'Create a commercial advertising background for a {format_name}. '
                f'The primary subject must clearly represent this product or service: {project_subject}. '
                f'Audience: {inputs.get("audience", "")}. Verified context: {verified_context}. '
                f'Objective: {inputs.get("objective", "awareness")}. '
                'Bold promotional direction: high visual impact, strong focal subject, deliberate color blocking and clear lower composition for typography, '
                'warm neutral and coral palette, believable product detail. Background only: generate no text, letters, numbers, logos, watermarks, signage, labels, UI, or typography.',
                f'Create a commercial advertising background for a {format_name}. '
                f'The primary subject must clearly represent this product or service: {project_subject}. '
                f'Audience: {inputs.get("audience", "")}. '
                f'Benefit: {inputs.get("value_proposition", "")}. '
                'Modern minimal direction: uncluttered composition, one clear focal subject, restrained colors, subtle geometric light and ample upper-left negative space, '
                'clean contemporary brand aesthetic. Background only: generate no text, letters, numbers, logos, watermarks, signage, labels, UI, or typography.',
            ][:image_count]
            assets = []
            campaign_id = uuid.uuid4().hex
            for index, prompt in enumerate(image_prompts):
                try:
                    image_bytes, mime_type = generate_cloudflare_image_with_retry(prompt=prompt)
                    composed_bytes, composed_mime = compose_marketing_creative(
                        image_bytes, mime_type, copy_item=copy_item, inputs=inputs, style_index=index
                    )
                    path = f'marketing_campaigns/{campaign_id}/concept-{index + 1}.svg'
                    saved_paths.append(path)
                    stored_path = default_storage.save(path, ContentFile(composed_bytes))
                    assets.append({
                        'index': index, 'url': request.build_absolute_uri(default_storage.url(stored_path)),
                        'prompt': prompt, 'mime_type': composed_mime, 'background_mime_type': mime_type,
                        'style': CREATIVE_STYLES[index % len(CREATIVE_STYLES)]['name'], 'status': 'ready',
                    })
                except (CloudflareConfigurationError, CloudflareRequestError) as error:
                    logger.warning('Cloudflare image concept %s failed: %s', index + 1, error)
                    assets.append({'index': index, 'url': '', 'prompt': prompt, 'mime_type': 'image/jpeg', 'status': 'failed', 'error': str(error), 'retryable': getattr(error, 'retryable', False)})
            browser_key = '' if request.user.is_authenticated else workspace_key(request)
            if not request.user.is_authenticated and not browser_key:
                raise serializers.ValidationError('A valid marketing workspace identifier is required.')
            campaign = MarketingCampaign.objects.create(
                owner=request.user if request.user.is_authenticated else None,
                browser_key=browser_key,
                project=project,
                title=copy_item.get('title') or f'{format_name} campaign',
                content_type=format_name,
                platform=inputs.get('platform') or '',
                brief={**inputs, 'mode': mode, 'project_context_used': bool(project)},
                copy=copy_item,
                assets=assets,
                selected_asset=0,
            )
        except serializers.ValidationError as error:
            for path in saved_paths:
                default_storage.delete(path)
            return Response({'error': str(error.detail if hasattr(error, 'detail') else error)}, status=status.HTTP_400_BAD_REQUEST)
        except GeminiConfigurationError as error:
            for path in saved_paths:
                default_storage.delete(path)
            return Response({'error': str(error), 'code': 'gemini_not_configured'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except GeminiRequestError as error:
            for path in saved_paths:
                default_storage.delete(path)
            return Response({'error': str(error), 'code': 'generation_failed', 'retryable': error.retryable}, status=status.HTTP_502_BAD_GATEWAY)
        except Exception:
            for path in saved_paths:
                default_storage.delete(path)
            logger.exception('Unexpected campaign generation failure for user %s.', request.user.pk if request.user.is_authenticated else 'anonymous')
            return Response({'error': 'Campaign generation failed. No incomplete campaign was saved.', 'code': 'generation_failed'}, status=status.HTTP_502_BAD_GATEWAY)
        return Response(MarketingCampaignSerializer(campaign).data, status=status.HTTP_201_CREATED)


class MarketingCampaignAssetRegenerateView(APIView):
    def post(self, request, campaign_id, asset_index):
        campaign = get_object_or_404(_campaign_visibility(request), pk=campaign_id)
        assets = list(campaign.assets or [])
        if asset_index < 0 or asset_index >= len(assets):
            return Response({'error': 'That campaign image does not exist.'}, status=status.HTTP_404_NOT_FOUND)
        asset = assets[asset_index]
        try:
            image_bytes, mime_type = generate_cloudflare_image_with_retry(prompt=asset.get('prompt', ''))
            composed_bytes, composed_mime = compose_marketing_creative(
                image_bytes, mime_type, copy_item=campaign.copy or {}, inputs=campaign.brief or {},
                style_index=asset_index,
            )
            path = f'marketing_campaigns/{campaign.id}/concept-{asset_index + 1}.svg'
            previous_url = asset.get('url', '')
            previous_path = previous_url.split('/media/', 1)[-1] if '/media/' in previous_url else ''
            if previous_path:
                default_storage.delete(previous_path)
            default_storage.delete(path)
            stored_path = default_storage.save(path, ContentFile(composed_bytes))
            asset.update({
                'url': f'{request.build_absolute_uri(default_storage.url(stored_path))}?v={uuid.uuid4().hex}',
                'mime_type': composed_mime, 'background_mime_type': mime_type,
                'style': CREATIVE_STYLES[asset_index % len(CREATIVE_STYLES)]['name'],
                'status': 'ready', 'error': '', 'retryable': False,
            })
            assets[asset_index] = asset
            campaign.assets = assets
            campaign.save(update_fields=['assets', 'updated_at'])
        except CloudflareConfigurationError as error:
            return Response({'error': str(error), 'code': 'cloudflare_not_configured'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except CloudflareRequestError as error:
            return Response({'error': str(error), 'code': 'image_generation_failed', 'retryable': error.retryable}, status=status.HTTP_502_BAD_GATEWAY)
        return Response(MarketingCampaignSerializer(campaign).data)


class MarketingCampaignCollectionView(APIView):
    def get(self, request):
        campaigns = _campaign_visibility(request)
        query = request.query_params.get('q', '').strip()[:120]
        if query:
            campaigns = campaigns.filter(Q(title__icontains=query) | Q(content_type__icontains=query))
        return Response({'results': MarketingCampaignSerializer(campaigns[:100], many=True).data})

    def post(self, request):
        campaign = get_object_or_404(_campaign_visibility(request), pk=request.data.get('id'))
        serializer = MarketingCampaignSerializer(campaign, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response({'error': 'Check the campaign changes and try again.', 'fields': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.data)


class MarketingCampaignDetailView(APIView):
    def patch(self, request, campaign_id):
        campaign = get_object_or_404(_campaign_visibility(request), pk=campaign_id)
        serializer = MarketingCampaignSerializer(campaign, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response({'error': 'Check the campaign changes and try again.', 'fields': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.data)

    def get(self, request, campaign_id):
        return Response(MarketingCampaignSerializer(get_object_or_404(_campaign_visibility(request), pk=campaign_id)).data)

    def delete(self, request, campaign_id):
        campaign = get_object_or_404(_campaign_visibility(request), pk=campaign_id)
        for asset in campaign.assets or []:
            url = asset.get('url', '')
            path = url.split('/media/', 1)[-1] if '/media/' in url else ''
            if path:
                default_storage.delete(path)
        campaign.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class MarketingContentSerializer(serializers.ModelSerializer):
    project_name = serializers.SerializerMethodField()

    class Meta:
        model = MarketingContentItem
        fields = ['id', 'title', 'body', 'content_type', 'platform', 'project', 'project_name', 'generation_inputs', 'version_history', 'status', 'created_at', 'updated_at']
        read_only_fields = ['id', 'project', 'project_name', 'version_history', 'created_at', 'updated_at']

    def get_project_name(self, obj):
        return (obj.project.understanding or {}).get('project_name') if obj.project_id else None

    def validate(self, attrs):
        if len(str(attrs)) > 14000:
            raise serializers.ValidationError('Saved content is too large.')
        if 'body' in attrs and not attrs['body'].strip():
            raise serializers.ValidationError({'body': 'Content cannot be empty.'})
        return attrs


class MarketingContentCollectionView(APIView):
    def _queryset(self, request):
        if request.user.is_authenticated:
            key = workspace_key(request)
            visibility = Q(owner=request.user)
            if key:
                visibility |= Q(owner__isnull=True, browser_key=key)
            return MarketingContentItem.objects.filter(visibility).select_related('project')
        key = workspace_key(request)
        return MarketingContentItem.objects.filter(owner__isnull=True, browser_key=key).select_related('project') if key else MarketingContentItem.objects.none()

    def get(self, request):
        items = self._queryset(request)
        project_id = request.query_params.get('project')
        content_type = request.query_params.get('type')
        platform = request.query_params.get('platform')
        saved_status = request.query_params.get('status')
        query = request.query_params.get('q', '').strip()[:120]
        if project_id == 'custom': items = items.filter(project__isnull=True)
        elif project_id: items = items.filter(project_id=project_id)
        if content_type: items = items.filter(content_type=content_type[:40])
        if platform: items = items.filter(platform__icontains=platform[:80])
        if saved_status: items = items.filter(status=saved_status[:12])
        if query: items = items.filter(Q(title__icontains=query) | Q(body__icontains=query))
        return Response({'results': MarketingContentSerializer(items[:200], many=True).data})

    def post(self, request):
        payload = request.data.copy()
        project_id = payload.pop('project_id', None)
        project = get_object_or_404(user_projects(request), pk=project_id) if project_id else None
        key = '' if request.user.is_authenticated else workspace_key(request)
        if not request.user.is_authenticated and not key:
            return Response({'error': 'A valid marketing workspace identifier is required.'}, status=status.HTTP_400_BAD_REQUEST)
        serializer = MarketingContentSerializer(data=payload)
        if not serializer.is_valid():
            return Response({'error': 'Check the saved content and try again.', 'fields': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
        item = serializer.save(owner=request.user if request.user.is_authenticated else None, project=project, browser_key=key)
        return Response(MarketingContentSerializer(item).data, status=status.HTTP_201_CREATED)


class MarketingContentDetailView(APIView):
    def _item(self, request, item_id):
        if request.user.is_authenticated:
            key = workspace_key(request)
            visibility = Q(owner=request.user)
            if key:
                visibility |= Q(owner__isnull=True, browser_key=key)
            items = MarketingContentItem.objects.filter(visibility)
        else:
            key = workspace_key(request)
            items = MarketingContentItem.objects.filter(owner__isnull=True, browser_key=key) if key else MarketingContentItem.objects.none()
        return get_object_or_404(items, pk=item_id)

    def patch(self, request, item_id):
        item = self._item(request, item_id)
        serializer = MarketingContentSerializer(item, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response({'error': 'Check the content changes and try again.', 'fields': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
        previous_saved_at = item.updated_at.isoformat() if item.updated_at else None
        previous = {'title': item.title, 'body': item.body, 'platform': item.platform, 'status': item.status}
        updated = serializer.save()
        if any(getattr(updated, key) != value for key, value in previous.items()):
            history = list(updated.version_history or [])
            history.append({**previous, 'saved_at': previous_saved_at})
            updated.version_history = history[-20:]
            updated.save(update_fields=['version_history', 'updated_at'])
        if request.user.is_authenticated and not updated.owner_id:
            updated.owner = request.user
            updated.browser_key = ''
            updated.save(update_fields=['owner', 'browser_key', 'updated_at'])
        return Response(serializer.data)

    def get(self, request, item_id):
        return Response(MarketingContentSerializer(self._item(request, item_id)).data)

    def delete(self, request, item_id):
        self._item(request, item_id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

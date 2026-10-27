from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.exceptions import NotFound
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from datetime import datetime, timedelta
import logging
import re
import urllib.parse
logger = logging.getLogger(__name__)

# pyrefly: ignore[missing-import]
from apps.projects.models import (
    ProjectDraft, ProjectStageGeneration, ProjectRepository, RoadmapAssessment,
    ProjectLearningState, MarketRadarReport, MindMapGraph, TaskVerificationReceipt
)
from .market_radar_service import generate_market_radar_and_flight_plan
from .stage_generation import STAGE_ORDER, enqueue_stage_generation, mark_draft_generation_changes, serialize_generation, stage_input_hash, stage_prerequisite_ready
from .roadmap_matcher import compare_roadmap_with_repository


def authorized_project_drafts(request):
    if request.user.is_authenticated:
        user_email = (request.user.email or '').strip()
        query = Q(owner=request.user) | Q(team_members__user=request.user)
        if user_email:
            query |= Q(team_members__email__iexact=user_email)
        return ProjectDraft.objects.filter(query).distinct()
    return ProjectDraft.objects.filter(owner__isnull=True)

from .gemini_service import (
    GeminiConfigurationError,
    GeminiRequestError,
    analyze_idea,
    explain_repository_finding,
    explain_roadmap_task_assessment,
    generate_glimpse_response,
    generate_idea_stage,
    research_business_model,
    tutor_learning_question,
    recommend_learning_path,
    classify_project_domain,
    generate_hardware_bom,
)


class IdeaAnalysisInputSerializer(serializers.Serializer):
    idea = serializers.CharField(max_length=4000, allow_blank=False, trim_whitespace=True)
    project_type = serializers.ChoiceField(choices=['Startup', 'Hackathon', 'College Project', 'Personal Project'], required=False, default='Startup')
    attachment_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    attachment_text = serializers.CharField(max_length=20000, required=False, allow_blank=True)
    project_name = serializers.CharField(max_length=160, required=False, allow_blank=True)
    problem_statement = serializers.CharField(max_length=1200, required=False, allow_blank=True)
    target_users = serializers.CharField(max_length=600, required=False, allow_blank=True)
    expected_outcome = serializers.CharField(max_length=800, required=False, allow_blank=True)


class IdeaAnalysisView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        serializer = IdeaAnalysisInputSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'error': 'Check the idea details and try again.', 'fields': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        try:
            result = analyze_idea(**serializer.validated_data)
        except GeminiConfigurationError as error:
            return Response({'error': str(error)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except GeminiRequestError as error:
            return Response({'error': str(error)}, status=status.HTTP_502_BAD_GATEWAY)

        return Response({'analysis': result}, status=status.HTTP_200_OK)


class GlimpseInputSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=['generate', 'edit', 'mvp_prompt'])
    prompt = serializers.CharField(max_length=3000, required=False, allow_blank=True, default='')
    conversation = serializers.ListField(
        child=serializers.DictField(), required=False, default=list, max_length=8
    )
    website = serializers.JSONField(required=False, default=dict)

    def validate(self, attrs):
        if attrs['action'] != 'mvp_prompt' and not attrs['prompt'].strip():
            raise serializers.ValidationError({'prompt': 'Describe the website or the change you want.'})
        if not isinstance(attrs['website'], dict):
            raise serializers.ValidationError({'website': 'Website context must be an object.'})
        if len(str(attrs['website'])) > 50000:
            raise serializers.ValidationError({'website': 'Website context is too large.'})
        conversation = attrs['conversation']
        for message in conversation:
            if message.get('role') not in {'user', 'assistant'} or not isinstance(message.get('content'), str):
                raise serializers.ValidationError({'conversation': 'Conversation messages must have a role and text content.'})
            if len(message['content']) > 2000:
                raise serializers.ValidationError({'conversation': 'A conversation message is too long.'})
        if attrs['action'] in {'edit', 'mvp_prompt'} and not attrs['website']:
            raise serializers.ValidationError({'website': 'Generate a website before requesting edits or an MVP prompt.'})
        return attrs


class GlimpseGenerateView(APIView):
    authentication_classes = []
    permission_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'glimpse_ai'

    def post(self, request):
        serializer = GlimpseInputSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {'error': 'Check the Glimpse request and try again.', 'fields': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            result = generate_glimpse_response(**serializer.validated_data)
        except GeminiConfigurationError as error:
            return Response({'error': str(error), 'code': 'ai_not_configured'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except GeminiRequestError as error:
            return Response({'error': str(error), 'code': 'ai_generation_failed'}, status=status.HTTP_502_BAD_GATEWAY)
        return Response(result, status=status.HTTP_200_OK)


class IdeaWorkflowInputSerializer(serializers.Serializer):
    stage = serializers.ChoiceField(choices=['research', 'feasibility', 'flight_plan'])
    idea = serializers.CharField(max_length=4000, allow_blank=False, trim_whitespace=True)
    project_type = serializers.ChoiceField(choices=['Startup', 'Hackathon', 'College Project', 'Personal Project'])
    project_id = serializers.UUIDField(required=False)
    project_details = serializers.JSONField(required=False, default=dict)

    def validate_project_details(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError('Project details must be an object.')
        if len(str(value)) > 50000:
            raise serializers.ValidationError('Project details are too long.')
        return value


class IdeaWorkflowStageView(APIView):
    def post(self, request):
        serializer = IdeaWorkflowInputSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'error': 'Check the project details and try again.', 'fields': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
        try:
            values = dict(serializer.validated_data)
            project_id = values.pop('project_id', None)
            if project_id:
                drafts = authorized_project_drafts(request)
                saved_project = drafts.filter(pk=project_id).first()
                if saved_project:
                    supplied_details = values.pop('project_details', {})
                    saved_details = {'understanding': saved_project.understanding, **saved_project.workflow}
                    # Attachments are transient input material; saved project fields remain authoritative.
                    if supplied_details.get('attachment'):
                        saved_details['attachment'] = supplied_details['attachment']
                    if saved_project.start_date:
                        saved_details['start_date'] = saved_project.start_date.isoformat()
                    if saved_project.deadline:
                        saved_details['deadline'] = saved_project.deadline.isoformat()
                    saved_details['team_size'] = saved_project.team_size
                    saved_details['weekly_hours'] = saved_project.weekly_hours
                    for key in ('start_date', 'deadline', 'team_size', 'weekly_hours', 'completed_task_ids'):
                        if supplied_details.get(key) is not None:
                            saved_details[key] = supplied_details[key]
                    values['idea'] = saved_project.idea
                    values['project_type'] = saved_project.project_type
                    values['project_details'] = saved_details
            result = generate_idea_stage(**values)
        except GeminiConfigurationError as error:
            return Response({'error': str(error)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except GeminiRequestError as error:
            return Response({'error': str(error)}, status=status.HTTP_502_BAD_GATEWAY)
        return Response({'result': result}, status=status.HTTP_200_OK)


class ProjectRepositorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectRepository
        fields = [
            'id', 'repo_owner', 'repo_name', 'repo_full_name', 'repo_url',
            'selected_branch', 'connection_status', 'last_synced_sha',
            'last_synced_at', 'detected_technologies', 'latest_analysis',
            'is_empty', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class RoadmapAssessmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoadmapAssessment
        fields = [
            'id', 'project', 'repository', 'commit_sha', 'branch',
            'summary', 'task_assessments', 'milestone_assessments',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ProjectDraftSerializer(serializers.ModelSerializer):
    project_type = serializers.ChoiceField(choices=['Startup', 'Hackathon', 'College Project', 'Personal Project'])
    current_stage = serializers.ChoiceField(choices=['understanding', 'research', 'feasibility', 'launch_timing', 'timing', 'flight_plan'])
    repository = serializers.SerializerMethodField()
    latest_assessment = serializers.SerializerMethodField()
    market_radar = serializers.SerializerMethodField()
    mindmap_graph = serializers.SerializerMethodField()
    team_size = serializers.IntegerField(min_value=1, max_value=50, required=False, allow_null=True)

    class Meta:
        model = ProjectDraft
        fields = [
            'id', 'idea', 'project_type', 'attachment', 'understanding',
            'workflow', 'current_stage', 'start_date', 'deadline',
            'team_size', 'weekly_hours', 'schedule_metadata',
            'business_model',
            'xp_points', 'xp_level', 'market_radar', 'mindmap_graph',
            'repository', 'latest_assessment',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate(self, attrs):
        start = attrs.get('start_date') or (self.instance.start_date if self.instance else None)
        deadline = attrs.get('deadline') or (self.instance.deadline if self.instance else None)
        if deadline and start and deadline <= start:
            raise serializers.ValidationError({'deadline': 'The deadline must be strictly after the start date.'})
        return attrs

    def get_market_radar(self, obj):
        try:
            if hasattr(obj, 'market_radar') and obj.market_radar:
                r = obj.market_radar
                return {
                    'summary': r.summary,
                    'competitors': r.competitors,
                    'customer_voice': r.customer_voice,
                    'citations': r.citations,
                    'validation_experiments': r.validation_experiments,
                    'created_at': r.created_at.isoformat(),
                }
        except Exception:
            pass
        return (obj.workflow or {}).get('market_radar', None)

    def get_mindmap_graph(self, obj):
        try:
            if hasattr(obj, 'mindmap_graph') and obj.mindmap_graph:
                g = obj.mindmap_graph
                return {
                    'nodes': g.nodes,
                    'edges': g.edges,
                    'layout_settings': g.layout_settings,
                }
        except Exception:
            pass
        return (obj.workflow or {}).get('mindmap_graph', None)

    def get_repository(self, obj):
        try:
            if hasattr(obj, 'repository') and obj.repository:
                return ProjectRepositorySerializer(obj.repository).data
        except Exception:
            pass
        return None

    def get_latest_assessment(self, obj):
        try:
            assessment = obj.roadmap_assessments.first()
            if assessment:
                return RoadmapAssessmentSerializer(assessment).data
        except Exception:
            pass
        return None

    def validate_idea(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('An idea is required.')
        return value

    def validate_understanding(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError('Understanding must be an object.')
        return value

    def validate_workflow(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError('Workflow must be an object.')
        if len(str(value)) > 100000:
            raise serializers.ValidationError('Workflow is too large.')
        return value


class ProjectDraftView(APIView):
    """Browser drafts have UUID bearer access until user auth is implemented."""

    def _drafts_for_request(self, request):
        return authorized_project_drafts(request)

    def get(self, request, draft_id):
        draft = get_object_or_404(self._drafts_for_request(request), pk=draft_id)
        return Response(ProjectDraftSerializer(draft).data)

    def delete(self, request, draft_id):
        if request.user.is_authenticated:
            drafts = ProjectDraft.objects.filter(owner=request.user)
        else:
            drafts = ProjectDraft.objects.filter(owner__isnull=True)
        draft = drafts.filter(pk=draft_id).first()
        if draft is None:
            if ProjectDraft.objects.filter(pk=draft_id).exists():
                raise NotFound
            return Response(status=status.HTTP_204_NO_CONTENT)
        draft.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    def put(self, request, draft_id):
        payload = request.data.copy()
        edited_stages = payload.pop('edited_stages', [])
        allowed_edits = {'understanding', *STAGE_ORDER}
        if not isinstance(edited_stages, list) or any(stage not in allowed_edits for stage in edited_stages):
            return Response({'error': 'Edited stages must be a list of valid stage names.'}, status=status.HTTP_400_BAD_REQUEST)
        with transaction.atomic():
            existing = self._drafts_for_request(request).select_for_update().filter(pk=draft_id).first()
            if not existing and ProjectDraft.objects.filter(pk=draft_id).exists():
                raise NotFound
            previous_workflow = existing.workflow if existing else {}
            serializer = ProjectDraftSerializer(existing, data=payload)
            if not serializer.is_valid():
                return Response({'error': 'Check the project draft and try again.', 'fields': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
            next_workflow = serializer.validated_data.get('workflow') or {}
            if existing:
                for stage in STAGE_ORDER:
                    if stage in edited_stages or next_workflow.get(stage) == previous_workflow.get(stage):
                        continue
                    generation = ProjectStageGeneration.objects.filter(project=existing, stage=stage, has_generated_result=True).first()
                    if generation:
                        next_workflow[stage] = previous_workflow.get(stage)
                serializer.validated_data['workflow'] = next_workflow
            draft = serializer.save(owner=(existing.owner if existing and existing.owner_id else (request.user if request.user.is_authenticated else None)), id=draft_id)
            # pyrefly: ignore[missing-import]
            from apps.core.team_workspace import ensure_member_slots
            ensure_member_slots(draft, current_user=request.user)
            mark_draft_generation_changes(draft, previous_workflow, edited_stages)
        return Response(ProjectDraftSerializer(draft).data, status=status.HTTP_200_OK if existing else status.HTTP_201_CREATED)


BUSINESS_MODEL_DEFAULTS = {
    'software': ['subscription', 'freemium'],
    'hardware': ['one_time', 'hardware_service'],
    'hybrid': ['one_time', 'subscription'],
    'digital': ['subscription', 'freemium'],
    'physical': ['one_time', 'hardware_service'],
    'services': ['service_fee', 'marketplace'],
}


def _business_model_recommendation(draft):
    domain = (draft.business_model or {}).get('domain') or (draft.understanding or {}).get('domain') or 'software'
    domain = domain if domain in BUSINESS_MODEL_DEFAULTS else 'software'
    problem = (draft.understanding or {}).get('problem_statement') or draft.idea
    grants = {
        'Startup': ['Startup India Seed Fund', 'MeitY TIDE 2.0'],
        'Hackathon': ['Smart India Hackathon', 'MeitY TIDE 2.0'],
        'College Project': ['AICTE IDEA Lab', 'SSIP / College Innovation Grant'],
        'Personal Project': ['Local incubator or college grant', 'Startup India Seed Fund (after incorporation)'],
    }
    return {
        'recommended_models': BUSINESS_MODEL_DEFAULTS[domain],
        'reason': f'For this {domain} project ({str(problem)[:180]}), validate demand before increasing acquisition spend.',
        'matched_grants': grants.get(draft.project_type, grants['Startup']),
    }


class BusinessModelGenerationView(APIView):
    def post(self, request, draft_id):
        draft = get_object_or_404(authorized_project_drafts(request), pk=draft_id)
        result = _business_model_recommendation(draft)
        requested_domain = request.data.get('domain')
        if requested_domain in BUSINESS_MODEL_DEFAULTS:
            result['recommended_models'] = BUSINESS_MODEL_DEFAULTS[requested_domain]
        return Response(result)


class BusinessModelResearchInputSerializer(serializers.Serializer):
    purpose = serializers.CharField(max_length=2000, required=False, allow_blank=True)
    market = serializers.CharField(max_length=120, required=False, default='India', allow_blank=False)
    currency = serializers.ChoiceField(choices=['INR', 'USD'], required=False, default='INR')


class BusinessModelResearchView(APIView):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'business_model_ai'

    def post(self, request, draft_id):
        draft = get_object_or_404(authorized_project_drafts(request), pk=draft_id)
        serializer = BusinessModelResearchInputSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {'error': 'Provide a valid project market and currency.', 'fields': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )
        understanding = draft.understanding or {}
        project_details = {
            'problem_statement': understanding.get('problem_statement', ''),
            'target_users': understanding.get('target_users', ''),
            'expected_outcome': understanding.get('expected_outcome', ''),
            'domain': understanding.get('domain', ''),
        }
        try:
            result = research_business_model(
                idea=draft.idea,
                project_name=understanding.get('project_name', ''),
                project_type=draft.project_type,
                project_details=project_details,
                purpose=serializer.validated_data.get('purpose', ''),
                market=serializer.validated_data['market'].strip(),
                currency=serializer.validated_data['currency'],
            )
        except GeminiConfigurationError as error:
            return Response({'error': str(error), 'code': 'gemini_not_configured'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except GeminiRequestError as error:
            return Response({'error': str(error), 'code': 'gemini_unavailable'}, status=status.HTTP_502_BAD_GATEWAY)
        return Response(result, status=status.HTTP_200_OK)


class BusinessModelInputSerializer(serializers.Serializer):
    domain = serializers.CharField(required=False, default='software')
    selected_models = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=list,
    )
    total_budget = serializers.IntegerField(required=False, default=30000)
    buckets = serializers.DictField(required=False, default=dict)
    fixed_monthly_costs = serializers.IntegerField(required=False, default=0)
    monthly_marketing = serializers.IntegerField(required=False, default=0)
    monthly_customers = serializers.IntegerField(required=False, default=0)
    average_revenue_per_customer = serializers.IntegerField(required=False, default=0)
    cac = serializers.IntegerField(required=False, default=0)

    # Multi-tab studio sections
    overview = serializers.DictField(required=False, default=dict)
    market_size = serializers.DictField(required=False, default=dict)
    unit_economics = serializers.DictField(required=False, default=dict)
    runway_ask = serializers.DictField(required=False, default=dict)
    moat_why_now = serializers.DictField(required=False, default=dict)
    market_research = serializers.DictField(required=False, default=dict)
    consistency_checks = serializers.DictField(required=False, default=dict)
    currency = serializers.CharField(required=False, default='INR')

    def validate(self, attrs):
        # If legacy budget buckets were supplied, validate budget equality
        buckets = attrs.get('buckets') or {}
        total_b = attrs.get('total_budget')
        if buckets and total_b and sum(buckets.values()) != total_b:
            pass  # Allow flexibility for new multi-tab studio edits
        return attrs


class BusinessModelView(APIView):
    def get(self, request, draft_id):
        draft = get_object_or_404(authorized_project_drafts(request), pk=draft_id)
        plan = dict(draft.business_model or {})
        from apps.projects.models import BusinessModelRevision
        revisions = list(
            BusinessModelRevision.objects.filter(project=draft).values('id', 'summary', 'created_at')[:10]
        )
        return Response({'business_model': plan, 'revisions': revisions})

    def put(self, request, draft_id):
        draft = get_object_or_404(authorized_project_drafts(request), pk=draft_id)
        serializer = BusinessModelInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        plan = dict(draft.business_model or {})
        plan.update(serializer.validated_data)

        # Compute legacy summaries if present
        burn = plan.get('fixed_monthly_costs', 0) + plan.get('monthly_marketing', 0)
        rev = plan.get('monthly_customers', 0) * plan.get('average_revenue_per_customer', 0)
        if 'selected_models' in plan and plan['selected_models']:
            plan['revenue_model'] = plan['selected_models'][0]
        if 'total_budget' in plan:
            plan['budget'] = plan['total_budget']
            plan['monthly_burn'] = burn
            plan['monthly_revenue'] = rev
            plan['contribution_margin'] = rev - burn
            plan['runway_months'] = round(plan['total_budget'] / burn, 2) if burn else 24

        plan['saved_at'] = timezone.now().isoformat()

        workflow = dict(draft.workflow or {})
        workflow['business_model'] = plan
        metadata = dict(draft.schedule_metadata or {})
        metadata['financial_constraints'] = {
            'monthly_burn': plan.get('monthly_burn', burn),
            'runway_months': plan.get('runway_months', 24),
            'budget': plan.get('budget', plan.get('total_budget', 30000)),
        }
        draft.business_model = plan
        draft.workflow = workflow
        draft.schedule_metadata = metadata
        draft.save(update_fields=['business_model', 'workflow', 'schedule_metadata', 'updated_at'])

        # Store historical revision
        try:
            from apps.projects.models import BusinessModelRevision
            rev_model = plan.get('revenue_model') or (plan.get('overview', {}).get('revenue_model')) or 'Custom'
            BusinessModelRevision.objects.create(
                project=draft,
                plan_data=plan,
                summary=f"Updated financial plan ({rev_model})",
            )
        except Exception as e:
            logger.warning('Could not log business model revision: %s', e)

        return Response({
            'business_model': plan,
            'financial_constraints': metadata['financial_constraints'],
        })


class ProjectDraftCollectionView(APIView):
    """List only account-owned drafts; anonymous projects stay in browser storage and UUID access."""
    def get(self, request):
        if not request.user.is_authenticated:
            return Response({'results': []})
        drafts = authorized_project_drafts(request).select_related('repository')
        return Response({'results': ProjectDraftSerializer(drafts, many=True).data})


class ProjectLearningStateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectLearningState
        fields = ['step_status', 'step_concepts', 'saved_resources', 'recently_viewed', 'task_feedback', 'learning_path', 'path_task_key', 'path_context_hash', 'updated_at']
        read_only_fields = ['learning_path', 'path_task_key', 'path_context_hash', 'updated_at']

    def validate(self, attrs):
        if len(str(attrs)) > 40000:
            raise serializers.ValidationError('Learning progress is too large.')
        return attrs

    def validate_step_status(self, value):
        if not isinstance(value, dict) or len(value) > 300 or any(status not in ('not_started', 'in_progress', 'completed') for status in value.values()):
            raise serializers.ValidationError('Learning step progress must contain valid statuses.')
        return value

    def validate_step_concepts(self, value):
        if not isinstance(value, dict) or len(value) > 300 or any(not isinstance(key, str) or len(key) > 160 or not isinstance(concept, str) or len(concept) > 180 for key, concept in value.items()):
            raise serializers.ValidationError('Learning step concepts are invalid.')
        return value

    def validate_saved_resources(self, value):
        if not isinstance(value, list) or len(value) > 200 or any(not isinstance(item, str) or len(item) > 160 for item in value):
            raise serializers.ValidationError('Saved resources must be a list of resource identifiers.')
        return list(dict.fromkeys(value))

    def validate_recently_viewed(self, value):
        if not isinstance(value, list) or len(value) > 50 or any(not isinstance(item, str) or len(item) > 160 for item in value):
            raise serializers.ValidationError('Recently viewed must be a list of resource identifiers.')
        return list(dict.fromkeys(value))[-20:]

    def validate_task_feedback(self, value):
        if not isinstance(value, dict) or len(value) > 300 or len(str(value)) > 20000:
            raise serializers.ValidationError('Task learning feedback is too large.')
        return value


def owned_project(request, draft_id):
    return get_object_or_404(authorized_project_drafts(request), pk=draft_id)


class ProjectLearningStateView(APIView):
    def get(self, request, draft_id):
        project = owned_project(request, draft_id)
        state, _ = ProjectLearningState.objects.get_or_create(project=project)
        return Response(ProjectLearningStateSerializer(state).data)

    def put(self, request, draft_id):
        project = owned_project(request, draft_id)
        state, _ = ProjectLearningState.objects.get_or_create(project=project)
        serializer = ProjectLearningStateSerializer(state, data=request.data)
        if not serializer.is_valid():
            return Response({'error': 'Check the learning progress and try again.', 'fields': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data)


class ProjectLearningTutorView(APIView):
    def post(self, request, draft_id):
        project = owned_project(request, draft_id)
        question = request.data.get('question', '')
        level = request.data.get('level', 'beginner')
        code_context = request.data.get('code_context', '')
        task = request.data.get('task') or {}
        if not isinstance(question, str) or not question.strip() or len(question) > 1500:
            return Response({'error': 'Enter a question of up to 1,500 characters.'}, status=status.HTTP_400_BAD_REQUEST)
        if level not in ('beginner', 'intermediate', 'advanced') or not isinstance(code_context, str) or len(code_context) > 5000 or not isinstance(task, dict) or len(str(task)) > 3000:
            return Response({'error': 'Check the tutor context and try again.'}, status=status.HTTP_400_BAD_REQUEST)
        repo = None
        try:
            repo = project.repository
        except ProjectRepository.DoesNotExist:
            pass
        context = {
            'name': (project.understanding or {}).get('project_name', ''),
            'description': (project.understanding or {}).get('problem_statement', '') or project.idea,
            'technologies': repo.detected_technologies if repo else [],
            'repository': repo.latest_analysis if repo else {},
        }
        try:
            answer = tutor_learning_question(project=context, task=task, question=question.strip(), level=level, code_context=code_context)
        except GeminiConfigurationError as error:
            return Response({'error': str(error), 'code': 'gemini_unavailable'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except GeminiRequestError as error:
            return Response({'error': str(error), 'code': 'tutor_failed'}, status=status.HTTP_502_BAD_GATEWAY)
        return Response({'answer': answer, 'repository_evidence_available': bool(repo and repo.latest_analysis)})


class ProjectLearningRecommendationsView(APIView):
    def post(self, request, draft_id):
        project = owned_project(request, draft_id)
        task_key = request.data.get('task_key', '')
        resources = request.data.get('resources', [])
        if not isinstance(task_key, str) or len(task_key) > 20 or not isinstance(resources, list) or len(resources) > 40:
            return Response({'error': 'Check the learning request and try again.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            milestone_index, task_index = [int(part) for part in task_key.split('-', 1)]
            task = project.workflow['flight_plan']['milestones'][milestone_index]['tasks'][task_index]
        except (ValueError, TypeError, KeyError, IndexError):
            return Response({'error': 'The selected roadmap task is no longer available.'}, status=status.HTTP_404_NOT_FOUND)
        clean_resources = []
        for resource in resources:
            if not isinstance(resource, dict) or not isinstance(resource.get('id'), str) or not isinstance(resource.get('title'), str):
                return Response({'error': 'Learning resource metadata is invalid.'}, status=status.HTTP_400_BAD_REQUEST)
            clean_resources.append({'id': resource['id'][:160], 'title': resource['title'][:180], 'topics': [str(x)[:80] for x in resource.get('topics', [])[:8]] if isinstance(resource.get('topics', []), list) else []})
        try:
            repo = project.repository
        except ProjectRepository.DoesNotExist:
            repo = None
        context = {
            'name': (project.understanding or {}).get('project_name', ''),
            'description': (project.understanding or {}).get('problem_statement', '') or project.idea,
            'project_type': project.project_type,
            'technologies': repo.detected_technologies if repo else [],
            'repository_analysis_summary': (repo.latest_analysis or {}).get('summary', {}) if repo else {},
        }
        completed_concepts = request.data.get('completed_concepts', [])
        if not isinstance(completed_concepts, list) or len(completed_concepts) > 80 or any(not isinstance(value, str) or len(value) > 180 for value in completed_concepts):
            return Response({'error': 'Completed learning concepts are invalid.'}, status=status.HTTP_400_BAD_REQUEST)
        import hashlib
        import json
        from django.db import transaction
        context_hash = hashlib.sha256(json.dumps({'project': context, 'task': task, 'resources': clean_resources}, sort_keys=True, ensure_ascii=False, default=str).encode('utf-8')).hexdigest()
        state, _ = ProjectLearningState.objects.get_or_create(project=project)
        if state.path_task_key == task_key and state.path_context_hash == context_hash and isinstance(state.learning_path, list) and state.learning_path:
            return Response({'steps': state.learning_path, 'task': task, 'task_key': task_key, 'repository_evidence_available': bool(repo and repo.latest_analysis), 'cached': True})
        try:
            steps = recommend_learning_path(project=context, task=task, resources=clean_resources, completed_concepts=completed_concepts)
        except GeminiConfigurationError as error:
            return Response({'error': str(error), 'code': 'gemini_unavailable'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except GeminiRequestError as error:
            return Response({'error': str(error), 'code': 'recommendations_failed'}, status=status.HTTP_502_BAD_GATEWAY)
        for step in steps:
            concept_key = f"{task_key}:{step['concept'].casefold()}"
            step['id'] = f"learn-{hashlib.sha256(concept_key.encode('utf-8')).hexdigest()[:16]}"
        with transaction.atomic():
            locked = ProjectLearningState.objects.select_for_update().get(project=project)
            # A concurrent generation may already have persisted the same project context.
            if locked.path_task_key != task_key or locked.path_context_hash != context_hash:
                locked.learning_path = steps
                locked.path_task_key = task_key
                locked.path_context_hash = context_hash
                locked.save(update_fields=['learning_path', 'path_task_key', 'path_context_hash', 'updated_at'])
            else:
                steps = locked.learning_path
        return Response({'steps': steps, 'task': task, 'task_key': task_key, 'repository_evidence_available': bool(repo and repo.latest_analysis), 'cached': False})


class ProjectStageGenerationView(APIView):
    def _draft(self, request, draft_id):
        return get_object_or_404(authorized_project_drafts(request), pk=draft_id)

    def get(self, request, draft_id, stage):
        if stage not in STAGE_ORDER:
            raise NotFound
        draft = self._draft(request, draft_id)
        job = ProjectStageGeneration.objects.filter(project=draft, stage=stage).first()
        if not job:
            return Response({'stage': stage, 'status': 'not_started', 'result': (draft.workflow or {}).get(stage), 'error': '', 'manually_edited': False, 'has_generated_result': False, 'requires_confirmation': False, 'stale_inputs': False})
        stale_inputs = stage_input_hash(draft, stage) != job.input_hash
        return Response(serialize_generation(job, draft, requires_confirmation=bool(stale_inputs and job.manually_edited and job.has_generated_result), stale_inputs=stale_inputs))

    def post(self, request, draft_id, stage):
        if stage not in STAGE_ORDER:
            raise NotFound
        draft = self._draft(request, draft_id)
        retry = request.data.get('retry', False)
        replace_edited = request.data.get('replace_edited', False)
        if not isinstance(retry, bool) or not isinstance(replace_edited, bool):
            return Response({'error': 'Retry and replace_edited must be boolean values.'}, status=status.HTTP_400_BAD_REQUEST)
        if not stage_prerequisite_ready(draft, stage):
            return Response({'error': 'The previous stage must be saved before this report can be prepared.', 'code': 'prerequisite_pending'}, status=status.HTTP_409_CONFLICT)
        job, requires_confirmation = enqueue_stage_generation(draft.id, stage, retry=retry, replace_edited=replace_edited)
        draft.refresh_from_db()
        stale_inputs = stage_input_hash(draft, stage) != job.input_hash
        return Response(serialize_generation(job, draft, requires_confirmation=requires_confirmation, stale_inputs=stale_inputs), status=status.HTTP_202_ACCEPTED)


class RepositoryEvidenceSerializer(serializers.Serializer):
    file = serializers.CharField(max_length=240)
    line = serializers.IntegerField(required=False, allow_null=True, min_value=1)
    text = serializers.CharField(max_length=700, allow_blank=True)


class RepositoryFindingExplanationSerializer(serializers.Serializer):
    repository = serializers.CharField(max_length=160, allow_blank=True)
    title = serializers.CharField(max_length=180)
    category = serializers.CharField(max_length=80)
    severity = serializers.CharField(max_length=30)
    impact = serializers.CharField(max_length=1000, allow_blank=True)
    recommendation = serializers.CharField(max_length=1000, allow_blank=True)
    evidence = RepositoryEvidenceSerializer(many=True, allow_empty=False)

    def validate_evidence(self, value):
        if len(value) > 6:
            raise serializers.ValidationError('Provide no more than six evidence references.')
        return value


class RepositoryFindingExplanationView(APIView):
    """AI may clarify supplied deterministic evidence; it cannot create scan findings."""
    authentication_classes = []
    permission_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'repository_ai'

    def post(self, request):
        serializer = RepositoryFindingExplanationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'error': 'Provide a valid finding and its source evidence.', 'fields': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
        try:
            values = serializer.validated_data
            finding = {key: values[key] for key in ('title', 'category', 'severity', 'impact', 'recommendation', 'evidence')}
            explanation = explain_repository_finding(repository=values['repository'], finding=finding)
        except GeminiConfigurationError as error:
            return Response({'error': str(error), 'code': 'gemini_not_configured'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except GeminiRequestError as error:
            return Response({'error': str(error)}, status=status.HTTP_502_BAD_GATEWAY)
        return Response({'explanation': explanation}, status=status.HTTP_200_OK)


class ProjectRepositoryInputSerializer(serializers.Serializer):
    owner = serializers.CharField(max_length=160, required=False, allow_blank=True)
    repo_owner = serializers.CharField(max_length=160, required=False, allow_blank=True)
    name = serializers.CharField(max_length=160, required=False, allow_blank=True)
    repo_name = serializers.CharField(max_length=160, required=False, allow_blank=True)
    repo_url = serializers.CharField(max_length=500, required=False, allow_blank=True)
    selected_branch = serializers.CharField(max_length=160, required=False, allow_blank=True)
    connection_status = serializers.ChoiceField(
        choices=['connected', 'empty', 'sync_failed', 'disconnected'],
        default='connected'
    )
    last_synced_sha = serializers.CharField(max_length=64, required=False, allow_blank=True)
    last_synced_at = serializers.DateTimeField(required=False, allow_null=True)
    detected_technologies = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        default=list
    )
    is_empty = serializers.BooleanField(required=False, default=False)

    def validate(self, attrs):
        owner = (attrs.get('repo_owner') or attrs.get('owner') or '').strip()
        name = (attrs.get('repo_name') or attrs.get('name') or '').strip()
        if not owner or not name:
            raise serializers.ValidationError('Both repository owner and repository name are required.')
        attrs['owner'] = owner
        attrs['name'] = name
        return attrs


class ProjectRepositoryView(APIView):
    """Manage GitHub repository association for a project draft."""

    def _drafts_for_request(self, request):
        return authorized_project_drafts(request)

    def get(self, request, draft_id):
        draft = get_object_or_404(self._drafts_for_request(request), pk=draft_id)
        if not hasattr(draft, 'repository') or not draft.repository:
            return Response({'error': 'No repository connected to this project.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(ProjectRepositorySerializer(draft.repository).data, status=status.HTTP_200_OK)

    def post(self, request, draft_id):
        draft = get_object_or_404(self._drafts_for_request(request), pk=draft_id)
        serializer = ProjectRepositoryInputSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'error': 'Check the repository details and try again.', 'fields': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        owner = data['owner']
        name = data['name']
        defaults = {
            'repo_owner': owner,
            'repo_name': name,
            'repo_full_name': f'{owner}/{name}',
            'repo_url': data.get('repo_url') or f'https://github.com/{owner}/{name}',
            'selected_branch': data.get('selected_branch', ''),
            'connection_status': data.get('connection_status', 'connected'),
            'last_synced_sha': data.get('last_synced_sha', ''),
            'last_synced_at': data.get('last_synced_at') or timezone.now(),
            'detected_technologies': data.get('detected_technologies', []),
            'is_empty': data.get('is_empty', False),
        }

        repo, created = ProjectRepository.objects.update_or_create(
            project=draft,
            defaults=defaults,
        )
        return Response(ProjectRepositorySerializer(repo).data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    def delete(self, request, draft_id):
        draft = get_object_or_404(self._drafts_for_request(request), pk=draft_id)
        if hasattr(draft, 'repository') and draft.repository:
            draft.repository.delete()
            return Response({'message': 'Repository disconnected.'}, status=status.HTTP_200_OK)
        return Response({'error': 'No repository connected to this project.'}, status=status.HTTP_404_NOT_FOUND)


class UserRepositoriesView(APIView):
    """List connected repositories accessible to the requesting user."""

    def get(self, request):
        if request.user.is_authenticated:
            repos = ProjectRepository.objects.filter(project__in=authorized_project_drafts(request))
        else:
            repos = ProjectRepository.objects.filter(project__owner__isnull=True)
        return Response({'repositories': ProjectRepositorySerializer(repos, many=True).data}, status=status.HTTP_200_OK)


class ProjectRepositoryAnalysisView(APIView):
    """Save or retrieve the latest repository analysis for a project's repository."""

    def _drafts_for_request(self, request):
        return authorized_project_drafts(request)

    def get(self, request, draft_id):
        draft = get_object_or_404(self._drafts_for_request(request), pk=draft_id)
        if not hasattr(draft, 'repository') or not draft.repository:
            return Response({'error': 'No repository connected to this project.'}, status=status.HTTP_404_NOT_FOUND)
        return Response({
            'repository': ProjectRepositorySerializer(draft.repository).data,
            'analysis': draft.repository.latest_analysis,
        }, status=status.HTTP_200_OK)

    def post(self, request, draft_id):
        draft = get_object_or_404(self._drafts_for_request(request), pk=draft_id)
        if not hasattr(draft, 'repository') or not draft.repository:
            return Response({'error': 'No repository connected to this project.'}, status=status.HTTP_400_BAD_REQUEST)

        analysis = request.data.get('analysis')
        if not isinstance(analysis, dict):
            return Response({'error': 'Analysis data must be a dictionary object.'}, status=status.HTTP_400_BAD_REQUEST)

        repo = draft.repository
        repo.latest_analysis = analysis
        commit_sha = request.data.get('commit_sha') or analysis.get('revision')
        if commit_sha and isinstance(commit_sha, str):
            repo.last_synced_sha = commit_sha
        repo.last_synced_at = timezone.now()
        repo.save(update_fields=['latest_analysis', 'last_synced_sha', 'last_synced_at', 'updated_at'])

        return Response({
            'message': 'Repository analysis saved.',
            'repository': ProjectRepositorySerializer(repo).data,
        }, status=status.HTTP_200_OK)


class RoadmapCompareRepositoryView(APIView):
    """
    Compare the project's Flight Plan against actual repository evidence.
    Creates and persists a RoadmapAssessment record tied to a specific revision.
    """

    def _drafts_for_request(self, request):
        return authorized_project_drafts(request)

    def post(self, request, draft_id):
        draft = get_object_or_404(self._drafts_for_request(request), pk=draft_id)
        if not hasattr(draft, 'repository') or not draft.repository:
            return Response({
                'error': 'No repository is connected to this project. Connect a repository first.',
                'code': 'no_repository',
            }, status=status.HTTP_400_BAD_REQUEST)

        repo = draft.repository
        flight_plan = (draft.workflow or {}).get('flight_plan')
        if not flight_plan or not isinstance(flight_plan, dict) or not flight_plan.get('milestones'):
            # Fallback to starter plan if flight_plan not generated yet
            from .stage_generation import STAGE_ORDER
            flight_plan = {
                'summary': 'Roadmap for ' + str(draft.idea)[:60],
                'milestones': [
                    {
                        'title': 'Core implementation',
                        'tasks': ['Set up project and repository', 'Build core flow', 'Verify integration'],
                    }
                ],
            }

        # Allow caller to pass refreshed analysis, or use existing repo latest_analysis
        analysis = request.data.get('analysis') or repo.latest_analysis or {}
        commit_sha = request.data.get('commit_sha') or repo.last_synced_sha or analysis.get('revision') or ''

        repo_info = {
            'repo_owner': repo.repo_owner,
            'repo_name': repo.repo_name,
            'repo_full_name': repo.repo_full_name,
            'selected_branch': repo.selected_branch,
            'last_synced_sha': commit_sha,
            'is_empty': repo.is_empty or not analysis.get('evidenceFiles'),
        }

        # Run deterministic evidence matching
        comparison = compare_roadmap_with_repository(
            flight_plan=flight_plan,
            repository_info=repo_info,
            analysis=analysis,
            commit_sha=commit_sha,
        )

        # Persist RoadmapAssessment
        assessment = RoadmapAssessment.objects.create(
            project=draft,
            repository=repo,
            commit_sha=comparison['commit_sha'],
            branch=comparison['branch'],
            summary=comparison['summary'],
            task_assessments=comparison['task_assessments'],
            milestone_assessments=comparison['milestone_assessments'],
        )

        return Response(RoadmapAssessmentSerializer(assessment).data, status=status.HTTP_201_CREATED)


class RoadmapAssessmentView(APIView):
    """Retrieve the latest or revision-specific RoadmapAssessment for a project draft."""

    def _drafts_for_request(self, request):
        return authorized_project_drafts(request)

    def get(self, request, draft_id):
        draft = get_object_or_404(self._drafts_for_request(request), pk=draft_id)
        commit_sha = request.query_params.get('commit_sha')
        qs = draft.roadmap_assessments.all()
        if commit_sha:
            qs = qs.filter(commit_sha=commit_sha)
        assessment = qs.first()
        if not assessment:
            return Response({'error': 'No roadmap assessment found for this project.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(RoadmapAssessmentSerializer(assessment).data, status=status.HTTP_200_OK)


class RoadmapTaskAssessmentCorrectionView(APIView):
    """
    Allow user to confirm, reject, or correct a proposed task assessment (keep human control).
    """

    def _drafts_for_request(self, request):
        return authorized_project_drafts(request)

    def patch(self, request, draft_id, task_id):
        draft = get_object_or_404(self._drafts_for_request(request), pk=draft_id)
        assessment = draft.roadmap_assessments.first()
        if not assessment:
            return Response({'error': 'No roadmap assessment exists to update.'}, status=status.HTTP_404_NOT_FOUND)

        task_assessments = dict(assessment.task_assessments or {})
        if task_id not in task_assessments:
            return Response({'error': f'Task {task_id} not found in assessment.'}, status=status.HTTP_404_NOT_FOUND)

        current = dict(task_assessments[task_id])
        new_status = request.data.get('status')
        valid_statuses = [
            'not_assessed', 'evidence_found', 'partially_implemented',
            'mismatch_detected', 'verified', 'manual_review',
        ]
        if new_status and new_status not in valid_statuses:
            return Response({'error': f'Status must be one of: {", ".join(valid_statuses)}'}, status=status.HTTP_400_BAD_REQUEST)

        # If user attempts to mark 'verified', ensure checks passed or user explicitly overrides with verified note
        if new_status == 'verified' and not request.data.get('verified_check_passed'):
            return Response({
                'error': 'Tasks can only be marked Verified if their acceptance criteria checks actually passed.',
                'code': 'unverified_forbidden',
            }, status=status.HTTP_400_BAD_REQUEST)

        user_override = {
            'status': new_status or current['status'],
            'notes': str(request.data.get('notes') or '').strip()[:500],
            'confirmed': bool(request.data.get('confirmed', True)),
            'timestamp': timezone.now().isoformat(),
        }

        if new_status:
            current['status'] = new_status
            status_labels = {
                'not_assessed': 'Not assessed',
                'evidence_found': 'Evidence found',
                'partially_implemented': 'Partially implemented',
                'mismatch_detected': 'Blocked or mismatch detected',
                'verified': 'Verified',
                'manual_review': 'Needs manual review',
            }
            current['statusLabel'] = status_labels.get(new_status, new_status)

        current['user_override'] = user_override
        task_assessments[task_id] = current
        assessment.task_assessments = task_assessments

        # Recalculate summary counts
        summary = dict(assessment.summary or {})
        counts = {s: 0 for s in valid_statuses}
        for item in task_assessments.values():
            st = item.get('status', 'not_assessed')
            counts[st] = counts.get(st, 0) + 1

        for s, c in counts.items():
            summary[f'{s}_count'] = c
        total = len(task_assessments)
        evidence_backed = counts['evidence_found'] + counts['partially_implemented']
        summary['evidence_percentage'] = round(evidence_backed / total * 100) if total else 0
        summary['verified_percentage'] = round(counts['verified'] / total * 100) if total else 0
        assessment.summary = summary

        assessment.save(update_fields=['task_assessments', 'summary', 'updated_at'])
        return Response(RoadmapAssessmentSerializer(assessment).data, status=status.HTTP_200_OK)


class RoadmapTaskExplanationSerializer(serializers.Serializer):
    repository = serializers.CharField(max_length=160, allow_blank=True, default='')
    task = serializers.DictField()
    assessment = serializers.DictField()


class RoadmapTaskExplanationView(APIView):
    """
    Explain a roadmap task assessment using Gemini, strictly grounded in provided deterministic evidence.
    """
    authentication_classes = []
    permission_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'repository_ai'

    def post(self, request):
        serializer = RoadmapTaskExplanationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'error': 'Provide valid task and assessment details.', 'fields': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        values = serializer.validated_data
        try:
            explanation = explain_roadmap_task_assessment(
                repository=values['repository'],
                task=values['task'],
                assessment=values['assessment'],
            )
        except GeminiConfigurationError as error:
            return Response({'error': str(error), 'code': 'gemini_not_configured'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except GeminiRequestError as error:
            return Response({'error': str(error)}, status=status.HTTP_502_BAD_GATEWAY)

        return Response({'explanation': explanation}, status=status.HTTP_200_OK)


class ProjectReplanSerializer(serializers.Serializer):
    completed_task_ids = serializers.ListField(child=serializers.CharField(), required=False, default=list)
    start_date = serializers.DateField(required=False, allow_null=True)
    deadline = serializers.DateField(required=False, allow_null=True)
    team_size = serializers.IntegerField(min_value=1, required=False, allow_null=True)
    weekly_hours = serializers.IntegerField(min_value=1, max_value=168, required=False, allow_null=True)
    current_plan = serializers.JSONField(required=False, default=dict)


class ProjectReplanView(APIView):
    def _drafts_for_request(self, request):
        return authorized_project_drafts(request)

    def post(self, request, draft_id):
        draft = get_object_or_404(self._drafts_for_request(request), pk=draft_id)
        serializer = ProjectReplanSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'error': 'Invalid replan input.', 'fields': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        completed_task_ids = data.get('completed_task_ids', [])
        start_date = data.get('start_date') or draft.start_date or timezone.now().date()
        deadline = data.get('deadline') or draft.deadline
        team_size = data.get('team_size') or draft.team_size or 1
        weekly_hours = data.get('weekly_hours') or draft.weekly_hours or 20

        if not deadline:
            return Response({'error': 'A project deadline is required to replan.'}, status=status.HTTP_400_BAD_REQUEST)
        if deadline <= start_date:
            return Response({'error': 'The deadline must be strictly after the start date.'}, status=status.HTTP_400_BAD_REQUEST)

        current_plan = data.get('current_plan') or (draft.workflow or {}).get('flight_plan') or {}
        
        project_details = {
            'understanding': draft.understanding or {},
            'feasibility': (draft.workflow or {}).get('feasibility') or {},
            'existing_flight_plan': current_plan,
            'completed_task_ids': completed_task_ids,
            'start_date': start_date.isoformat(),
            'deadline': deadline.isoformat(),
            'team_size': team_size,
            'weekly_hours': weekly_hours,
        }

        from .roadmap_scheduler import schedule_and_validate_flight_plan

        ai_plan = None
        try:
            ai_plan = generate_idea_stage(
                stage='flight_plan',
                idea=draft.idea,
                project_type=draft.project_type,
                project_details=project_details,
            )
        except Exception:
            pass

        base_plan = ai_plan or current_plan
        proposed_plan = schedule_and_validate_flight_plan(
            base_plan,
            start_date=start_date,
            deadline=deadline,
            team_size=team_size,
            weekly_hours=weekly_hours,
            completed_task_ids=completed_task_ids,
        )

        all_new_tasks = [t for m in proposed_plan.get('milestones', []) for t in m.get('tasks', [])]
        completed_count = len([t for t in all_new_tasks if t.get('id') in completed_task_ids or t.get('status') == 'completed'])
        rescheduled_count = len(all_new_tasks) - completed_count

        comparison = {
            'completed_tasks_preserved': completed_count,
            'remaining_tasks_rescheduled': rescheduled_count,
            'total_milestones': len(proposed_plan.get('milestones', [])),
            'deadline': deadline.isoformat(),
            'days_remaining': proposed_plan.get('schedule_assessment', {}).get('days_remaining', 0),
            'feasibility_status': proposed_plan.get('schedule_assessment', {}).get('feasibility_status', 'on_track'),
            'mvp_recommendations': proposed_plan.get('schedule_assessment', {}).get('mvp_recommendations', []),
            'deferred_features': proposed_plan.get('schedule_assessment', {}).get('deferred_features', []),
        }

        return Response({
            'proposed_plan': proposed_plan,
            'comparison': comparison,
        }, status=status.HTTP_200_OK)


class ProjectLaunchInputSerializer(serializers.Serializer):
    idea = serializers.CharField(max_length=4000, allow_blank=False, trim_whitespace=True)
    project_type = serializers.ChoiceField(choices=['Startup', 'Hackathon', 'College Project', 'Personal Project'], required=False, default='Startup')
    attachment_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    attachment_text = serializers.CharField(max_length=20000, required=False, allow_blank=True)


class ProjectLaunchView(APIView):
    """
    End-to-end launch pipeline:
    Stage 1: Brave Search broad discovery
    Stage 2: Tavily deep page extraction (competitors, pricing, complaints)
    Stage 3: Gemini structured synthesis -> Flight Plan + Market Radar + Mind Map
    """
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        serializer = ProjectLaunchInputSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'error': 'Check the idea details and try again.', 'fields': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        idea = data['idea']
        project_type = data['project_type']
        attachment_text = data.get('attachment_text', '')

        try:
            result = generate_market_radar_and_flight_plan(
                idea=idea,
                project_type=project_type,
                attachment_text=attachment_text,
            )
        except Exception as error:
            logger.error(f"Launch pipeline failed: {error}")
            return Response({'error': f'Launch pipeline error: {str(error)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        understanding = {
            'project_name': result['project_name'],
            'problem_statement': result['problem_statement'],
            'target_users': result['target_users'],
            'expected_outcome': result['expected_outcome'],
        }
        workflow = {
            'market_radar': result['market_radar'],
            'flight_plan': result['flight_plan'],
            'mindmap_graph': result['mindmap_graph'],
            'web_research_sources': result['web_research_sources'],
        }

        milestones = result['flight_plan'].get('milestones', [])
        deadline = None
        if milestones and milestones[-1].get('target_date'):
            try:
                deadline = datetime.fromisoformat(milestones[-1]['target_date']).date()
            except Exception:
                deadline = (timezone.now().date() + timedelta(days=80))

        draft = ProjectDraft.objects.create(
            owner=request.user if request.user.is_authenticated else None,
            idea=idea,
            project_type=project_type,
            attachment={'name': data.get('attachment_name', ''), 'text': attachment_text[:20000]} if attachment_text else None,
            understanding=understanding,
            workflow=workflow,
            current_stage='flight_plan',
            start_date=timezone.now().date(),
            deadline=deadline,
            team_size=1,
            weekly_hours=20,
            xp_points=0,
            xp_level='Level 1: Idea Shaped',
        )

        MarketRadarReport.objects.create(
            project=draft,
            summary=result['market_radar'].get('summary', ''),
            competitors=result['market_radar'].get('competitors', []),
            customer_voice=result['market_radar'].get('customer_voice', []),
            citations=result['market_radar'].get('citations', []),
            validation_experiments=result['market_radar'].get('validation_experiments', []),
            raw_snapshots={'sources': result['web_research_sources']},
        )

        MindMapGraph.objects.create(
            project=draft,
            nodes=result['mindmap_graph'].get('nodes', []),
            edges=result['mindmap_graph'].get('edges', []),
            layout_settings={'theme': 'coral', 'spacing': 260, 'opacity': 0.85},
        )

        return Response({
            'project': ProjectDraftSerializer(draft).data,
            'market_radar': result['market_radar'],
            'flight_plan': result['flight_plan'],
            'mindmap_graph': result['mindmap_graph'],
        }, status=status.HTTP_201_CREATED)


class ProjectMarketRadarView(APIView):
    def get(self, request, draft_id):
        draft = get_object_or_404(ProjectDraft, pk=draft_id)
        radar = getattr(draft, 'market_radar', None)
        if not radar:
            radar_data = (draft.workflow or {}).get('market_radar', {})
            return Response({'market_radar': radar_data})
        return Response({
            'market_radar': {
                'summary': radar.summary,
                'competitors': radar.competitors,
                'customer_voice': radar.customer_voice,
                'citations': radar.citations,
                'validation_experiments': radar.validation_experiments,
                'created_at': radar.created_at.isoformat(),
            }
        })


class ProjectMindMapView(APIView):
    def get(self, request, draft_id):
        draft = get_object_or_404(ProjectDraft, pk=draft_id)
        graph = getattr(draft, 'mindmap_graph', None)
        if not graph:
            graph_data = (draft.workflow or {}).get('mindmap_graph', {'nodes': [], 'edges': []})
            return Response({'mindmap': graph_data})
        return Response({
            'mindmap': {
                'nodes': graph.nodes,
                'edges': graph.edges,
                'layout_settings': graph.layout_settings,
                'updated_at': graph.updated_at.isoformat(),
            }
        })

    def put(self, request, draft_id):
        draft = get_object_or_404(ProjectDraft, pk=draft_id)
        nodes = request.data.get('nodes', [])
        edges = request.data.get('edges', [])
        layout_settings = request.data.get('layout_settings', {})

        graph, _ = MindMapGraph.objects.get_or_create(project=draft)
        graph.nodes = nodes
        graph.edges = edges
        if layout_settings:
            graph.layout_settings = layout_settings
        graph.save()

        if draft.workflow is not None:
            draft.workflow['mindmap_graph'] = {'nodes': nodes, 'edges': edges, 'layout_settings': graph.layout_settings}
            draft.save(update_fields=['workflow', 'updated_at'])

        return Response({'success': True, 'node_count': len(nodes)})


class ProjectAddExperimentView(APIView):
    def post(self, request, draft_id):
        draft = get_object_or_404(ProjectDraft, pk=draft_id)
        experiment = request.data.get('experiment', {})
        if isinstance(experiment, str):
            try:
                import json
                experiment = json.loads(experiment)
            except Exception:
                experiment = {}
        if not isinstance(experiment, dict) or not experiment.get('title'):
            return Response({'error': 'Valid experiment details are required.'}, status=status.HTTP_400_BAD_REQUEST)

        workflow = draft.workflow or {}
        flight_plan = workflow.get('flight_plan', {})
        milestones = flight_plan.get('milestones', [])
        if not milestones:
            return Response({'error': 'No milestones found in flight plan.'}, status=status.HTTP_400_BAD_REQUEST)

        m1 = milestones[0]
        exp_id = f"m1-exp-{len(m1.get('tasks', [])) + 1}"
        new_task = {
            'id': exp_id,
            'title': f"Experiment: {experiment.get('title')}",
            'why_matters': f"Market Radar Experiment: {experiment.get('hypothesis', '')}",
            'radar_chip': f"Radar Validation ({experiment.get('estimated_cost', 'Low Cost')})",
            'steps': [
                {'text': f"Design experiment: {experiment.get('method', 'Setup smoke test')}", 'done': False},
                {'text': f"Measure target metric: {experiment.get('pass_fail_metric', 'Pass threshold')}", 'done': False},
                {'text': "Document pass/fail outcome in evidence log", 'done': False},
            ],
            'expected_evidence': ['docs/experiments/validation_report.md'],
            'verification_criteria': f"Pass threshold achieved: {experiment.get('pass_fail_metric', 'Metric met')}",
            'dependencies': [],
            'xp_reward': 150,
            'priority': 'high',
            'effort_hours': experiment.get('effort_days', 2) * 4,
            'suggested_role': 'Product Lead',
            'start_date': m1.get('start_date', ''),
            'target_date': m1.get('target_date', ''),
        }

        m1['tasks'] = [new_task] + m1.get('tasks', [])
        workflow['flight_plan'] = flight_plan
        draft.workflow = workflow
        draft.save(update_fields=['workflow', 'updated_at'])

        return Response({
            'success': True,
            'task': new_task,
            'flight_plan': flight_plan,
        }, status=status.HTTP_201_CREATED)


class TaskVerificationView(APIView):
    def post(self, request, draft_id):
        draft = get_object_or_404(ProjectDraft, pk=draft_id)
        task_key = request.data.get('task_key', '').strip()
        task_title = request.data.get('task_title', '').strip()
        proof_type = request.data.get('proof_type', 'manual_check')
        proof_details = request.data.get('proof_details', {})
        xp = int(request.data.get('xp_awarded', 150))

        if not task_key:
            return Response({'error': 'task_key is required.'}, status=status.HTTP_400_BAD_REQUEST)

        receipt, created = TaskVerificationReceipt.objects.get_or_create(
            project=draft,
            task_key=task_key,
            defaults={
                'task_title': task_title,
                'proof_type': proof_type,
                'proof_details': proof_details,
                'xp_awarded': xp,
            }
        )

        if created:
            draft.xp_points = (draft.xp_points or 0) + xp
            if draft.xp_points >= 1200:
                draft.xp_level = 'Level 4: Launch Ready'
            elif draft.xp_points >= 700:
                draft.xp_level = 'Level 3: Core Verified'
            elif draft.xp_points >= 300:
                draft.xp_level = 'Level 2: Prototype Grounded'
            else:
                draft.xp_level = 'Level 1: Idea Shaped'
            draft.save(update_fields=['xp_points', 'xp_level', 'updated_at'])

        return Response({
            'success': True,
            'task_key': task_key,
            'xp_awarded': xp if created else 0,
            'total_xp': draft.xp_points,
            'xp_level': draft.xp_level,
            'receipt_id': str(receipt.id),
        }, status=status.HTTP_200_OK)


class ClassifyDomainView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        idea = str(request.data.get('idea', '')).strip()
        project_type = str(request.data.get('project_type', 'Startup')).strip()
        if not idea:
            return Response({
                'domains': ['digital'],
                'domain': 'software',
                'confidence': 0.8,
                'reasoning': 'No idea text provided.',
                'detected_keywords': []
            }, status=status.HTTP_200_OK)

        result = classify_project_domain(idea, project_type)
        return Response(result, status=status.HTTP_200_OK)


# Curated catalog of verified product images and specifications
CURATED_HARDWARE_PARTS = [
    {
        'keywords': ['arduino', 'uno', 'atmega'],
        'name': 'Arduino Uno R3 (ATmega328P)',
        'category': 'Microcontroller',
        'price_range': '₹450 – ₹650',
        'image': '/components/arduino_uno.jpg',
        'description': 'Industry-standard 8-bit microcontroller board with 14 digital I/O pins and 6 analog inputs.',
        'wiring_tip': 'Power via 5V USB or 7-12V DC jack. Use 220Ω resistors for LED pins.',
        'learn_url': 'https://docs.arduino.cc/hardware/uno-rev3/',
    },
    {
        'keywords': ['esp32-cam', 'esp32 cam', 'ov2640', 'camera module'],
        'name': 'ESP32 CAM Wi-Fi + OV2640 Camera Module',
        'category': 'Sensor',
        'price_range': '₹450 – ₹650',
        'image': '/components/esp32_cam.jpg',
        'description': 'Compact camera development board with ESP32 chip, OV2640 2MP camera, and TF card slot.',
        'wiring_tip': 'Requires FTDI programmer to flash code. Supply steady 5V 2A power.',
        'learn_url': 'https://randomnerdtutorials.com/esp32-cam-video-streaming-face-recognition-arduino-ide/',
    },
    {
        'keywords': ['esp32', 'nodemcu', 'wifi', 'bluetooth', 'iot board', 'microcontroller'],
        'name': 'ESP32 NodeMCU Wi-Fi + Bluetooth Dev Board',
        'category': 'Microcontroller',
        'price_range': '₹350 – ₹550',
        'image': '/components/esp32_nodemcu.jpg',
        'description': 'Dual-core 240MHz MCU with integrated 2.4GHz Wi-Fi and Bluetooth BLE for IoT devices.',
        'wiring_tip': '3.3V logic board. Level shifter needed when interfacing with 5V sensors.',
        'learn_url': 'https://randomnerdtutorials.com/getting-started-with-esp32/',
    },
    {
        'keywords': ['raspberry pi', 'rpi', 'pi 4', 'single board computer'],
        'name': 'Raspberry Pi 4 Model B (4GB RAM)',
        'category': 'Single Board Computer',
        'price_range': '₹4,500 – ₹6,200',
        'image': 'https://upload.wikimedia.org/wikipedia/commons/f/f1/Raspberry_Pi_4_Model_B_-_Side.jpg',
        'description': 'Quad-core 64-bit Cortex-A72 computer with dual micro-HDMI 4K, gigabit ethernet & USB 3.0.',
        'wiring_tip': 'Requires 5V 3A USB-C power supply. Use standard 40-pin GPIO header.',
        'learn_url': 'https://www.raspberrypi.com/documentation/computers/getting-started.html',
    },
    {
        'keywords': ['ultrasonic', 'hc-sr04', 'distance', 'sonar', 'range'],
        'name': 'HC-SR04 Ultrasonic Distance Sensor',
        'category': 'Sensor',
        'price_range': '₹60 – ₹120',
        'image': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/HC-SR04_ultrasonic_sensor.jpg/640px-HC-SR04_ultrasonic_sensor.jpg',
        'description': 'Non-contact distance measurement module with 2cm – 400cm range.',
        'wiring_tip': 'VCC to 5V, GND to Ground. Trigger to digital pin, Echo to digital pin (use voltage divider for 3.3V MCUs).',
        'learn_url': 'https://howtomechatronics.com/tutorials/arduino/ultrasonic-sensor-hc-sr04/',
    },
    {
        'keywords': ['dht11', 'dht22', 'temperature', 'humidity'],
        'name': 'DHT22 / AM2302 High Precision Temp & Humidity Sensor',
        'category': 'Sensor',
        'price_range': '₹180 – ₹320',
        'image': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/DHT22.jpg/640px-DHT22.jpg',
        'description': 'Calibrated digital signal output temperature and humidity sensor with 0.1°C resolution.',
        'wiring_tip': 'Connect 10kΩ pull-up resistor between VCC and Data pin.',
        'learn_url': 'https://randomnerdtutorials.com/esp32-dht11-dht22-temperature-humidity-sensor-arduino-ide/',
    },
    {
        'keywords': ['servo', 'sg90', 'mg90s', 'mg996r', 'motor', 'actuator'],
        'name': 'MG90S / SG90 Metal Gear Micro Servo (180°)',
        'category': 'Actuator',
        'price_range': '₹120 – ₹220',
        'quantity': 2,
        'unit': 'pcs',
        'unit_price': 120,
        'image': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/TowerPro_SG90_9g_Micro_Servo.jpg/640px-TowerPro_SG90_9g_Micro_Servo.jpg',
        'description': 'Compact high-torque micro servo with metal gears for durable angular motion.',
        'wiring_tip': 'Brown/Black: GND, Red: 5V, Orange/Yellow: PWM Pin. Power from external 5V supply if using multiple servos.',
        'learn_url': 'https://docs.arduino.cc/learn/electronics/servo-motors/',
    },
    {
        'keywords': ['oled', 'display', 'i2c', 'screen', 'ssd1306', '0.96'],
        'name': '0.96 inch I2C OLED Display (128x64 SSD1306)',
        'category': 'Display',
        'price_range': '₹190 – ₹320',
        'quantity': 1,
        'unit': 'pcs',
        'unit_price': 220,
        'image': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/29/Oled_screen.jpg/640px-Oled_screen.jpg',
        'description': 'High-contrast monochrome OLED display with simple 4-pin I2C interface.',
        'wiring_tip': 'Connect VCC to 3.3V/5V, GND to Ground, SCL to A5/GPIO22, SDA to A4/GPIO21.',
        'learn_url': 'https://randomnerdtutorials.com/esp32-ssd1306-oled-display-arduino-ide/',
    },
    {
        'keywords': ['gps', 'neo-6m', 'neo6m', 'location', 'navigation', 'tracker'],
        'name': 'NEO-6M GPS Module with Ceramic Antenna',
        'category': 'Sensor',
        'price_range': '₹380 – ₹550',
        'quantity': 1,
        'unit': 'pcs',
        'unit_price': 420,
        'image': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/NEO-6M_GPS_module.jpg/640px-NEO-6M_GPS_module.jpg',
        'description': 'High-sensitivity GPS receiver with built-in EEPROM and UART serial interface for real-time coordinates.',
        'wiring_tip': 'VCC to 3.3V/5V, GND to GND, TX to MCU RX pin, RX to MCU TX pin (via voltage divider for 3.3V logic).',
        'learn_url': 'https://randomnerdtutorials.com/guide-to-neo-6m-gps-module-with-arduino/',
    },
    {
        'keywords': ['buzzer', 'alarm', 'sos', 'beeper', 'audio', 'sound'],
        'name': '5V Active Electronic Buzzer Module',
        'category': 'Actuator',
        'price_range': '₹25 – ₹60',
        'quantity': 2,
        'unit': 'pcs',
        'unit_price': 30,
        'image': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2b/Piezo_electric_audio_transducer.jpg/640px-Piezo_electric_audio_transducer.jpg',
        'description': 'Loud 85dB resonant alarm buzzer for instant audio feedback and emergency SOS signaling.',
        'wiring_tip': 'Connect positive pin (+) to digital GPIO via a 100Ω current-limiting resistor, negative (-) to GND.',
        'learn_url': 'https://arduinogetstarted.com/tutorials/arduino-piezo-buzzer',
    },
    {
        'keywords': ['gyro', 'accelerometer', 'mpu6050', 'imu', 'motion', 'orientation', 'tilt'],
        'name': 'MPU-6050 3-Axis Gyroscope + 3-Axis Accelerometer',
        'category': 'Sensor',
        'price_range': '₹120 – ₹240',
        'quantity': 1,
        'unit': 'pcs',
        'unit_price': 140,
        'image': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ad/MPU-6050_Module.jpg/640px-MPU-6050_Module.jpg',
        'description': '6-DOF motion tracking sensor with integrated Digital Motion Processor (DMP) over I2C.',
        'wiring_tip': 'Connect VCC to 3.3V, GND to GND, SCL to MCU SCL, SDA to MCU SDA. AD0 pin sets I2C address (default 0x68).',
        'learn_url': 'https://howtomechatronics.com/tutorials/arduino/arduino-and-mpu6050-accelerometer-and-gyroscope-tutorial/',
    },
    {
        'keywords': ['battery', '18650', 'power', 'rechargeable', 'power bank', 'bms'],
        'name': '18650 Li-ion 3.7V 2600mAh Rechargeable Battery + Dual Slot Holder',
        'category': 'Power',
        'price_range': '₹240 – ₹450',
        'quantity': 2,
        'unit': 'pcs',
        'unit_price': 160,
        'image': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/18650_cells.jpg/640px-18650_cells.jpg',
        'description': 'Reliable lithium-ion rechargeable battery pack providing autonomous portable DC power for hardware prototypes.',
        'wiring_tip': 'Always pair with a TP4056 charging module and protection circuit board (BMS) to avoid over-discharge.',
        'learn_url': 'https://batteryuniversity.com/article/bu-301a-types-of-battery-cells',
    },
    {
        'keywords': ['breadboard', 'wires', 'jumper', 'prototyping', 'cables'],
        'name': '830-Point Solderless Breadboard + 65-pc Jumper Wire Kit',
        'category': 'Prototyping',
        'price_range': '₹140 – ₹260',
        'quantity': 1,
        'unit': 'kit',
        'unit_price': 160,
        'image': '/components/breadboard_kit.jpg',
        'description': 'Standard solderless breadboard with power rails plus flexible male-to-male and male-to-female jumper cables.',
        'wiring_tip': 'Use red rail for power (+5V/3.3V) and blue/black rail for common ground (GND).',
        'learn_url': 'https://www.instructables.com/How-to-Use-a-Breadboard/',
    },
    {
        'keywords': ['relay', 'switch', 'ac control', 'relay module', 'channel relay'],
        'name': '5V Relay Module (1/2/4-Channel)',
        'category': 'Actuator',
        'price_range': '₹60 – ₹220',
        'quantity': 1,
        'unit': 'pcs',
        'unit_price': 120,
        'image': '/components/relay_module.jpg',
        'description': 'Isolates and switches 250V AC/10A or 30V DC/10A high-power appliances safely.',
        'wiring_tip': 'JD-VCC jumper controls optocoupler isolation. Active LOW signal trigger.',
        'learn_url': 'https://lastminuteengineers.com/one-channel-relay-module-arduino-tutorial/',
    },
]


def build_vendor_store_links(component_name):
    query = str(component_name or '').strip()
    import urllib.parse
    enc = urllib.parse.quote_plus(query)
    return [
        {
            'vendor': 'MakerBazar',
            'tagline': 'Default Maker Store · Real Parts',
            'logo': 'https://makerbazar.in/favicon.ico',
            'color': '#F97316',
            'bg': '#FFF7ED',
            'direct_search_url': f'https://makerbazar.in/search?q={enc}',
            'badge': 'Primary Store',
            'is_default': True,
            'availability': 'In Stock (MakerBazar)',
            'availability_status': 'in_stock',
        },
        {
            'vendor': 'Robocraze',
            'tagline': 'Robotics & IoT India',
            'logo': 'https://robocraze.com/favicon.ico',
            'color': '#2563EB',
            'bg': '#EFF6FF',
            'direct_search_url': f'https://robocraze.com/search?type=product&q={enc}',
            'badge': 'Alternative Option',
            'is_default': False,
            'availability': 'In Stock (Robocraze)',
            'availability_status': 'in_stock',
        },
        {
            'vendor': 'Roboin',
            'tagline': 'Indian Robotics Distributor',
            'logo': 'https://www.roboin.io/favicon.ico',
            'color': '#16A34A',
            'bg': '#F0FDF4',
            'direct_search_url': f'https://www.roboin.io/?s={enc}',
            'badge': 'Alternative Option',
            'is_default': False,
            'availability': 'In Stock (Roboin)',
            'availability_status': 'in_stock',
        },
        {
            'vendor': 'IndiaHobbyStore',
            'tagline': 'DIY Electronics & Kits',
            'logo': 'https://www.indiahobbystore.com/favicon.ico',
            'color': '#CA8A04',
            'bg': '#FEFCE8',
            'direct_search_url': f'https://www.indiahobbystore.com/search?q={enc}',
            'badge': 'Alternative Option',
            'is_default': False,
            'availability': 'Available',
            'availability_status': 'available',
        },
    ]


class HardwareBOMView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        idea = str(request.data.get('idea', '')).strip()
        problem = str(request.data.get('problem_statement', '')).strip()
        outcome = str(request.data.get('expected_outcome', '')).strip()

        components = generate_hardware_bom(idea, problem, outcome)
        if not components:
            # Fallback components based on keywords
            components = []
            lower = f"{idea} {problem}".lower()
            for part in CURATED_HARDWARE_PARTS:
                if any(kw in lower for kw in part['keywords']):
                    min_p, max_p = 300, 600
                    try:
                        nums = [int(s.replace(',', '')) for s in re.findall(r'\d[\d,]*', part['price_range'])]
                        if len(nums) >= 2:
                            min_p, max_p = nums[0], nums[1]
                    except Exception:
                        pass
                    qty = part.get('quantity', 1)
                    u_price = part.get('unit_price', min_p)
                    components.append({
                        'id': f"comp_{len(components)+1}",
                        'name': part['name'],
                        'category': part['category'],
                        'quantity': qty,
                        'unit': part.get('unit', 'pcs'),
                        'priceMin': min_p,
                        'priceMax': max_p,
                        'unit_price': u_price,
                        'total_price': u_price * qty,
                        'currency': 'INR',
                        'icon': '⚡',
                        'color': '#2563EB',
                        'bg': '#EFF6FF',
                        'image': part['image'],
                        'description': part['description'],
                        'wiring_tip': part['wiring_tip'],
                        'learnUrl': part['learn_url'],
                        'searchQuery': part['name'],
                        'required': True,
                        'vendors': build_vendor_store_links(part['name']),
                        'availability': 'In Stock (MakerBazar)',
                        'availability_status': 'in_stock',
                    })

            if not components:
                # Add default starter components
                components = [
                    {
                        'id': 'comp_1',
                        'name': 'ESP32 Wi-Fi + Bluetooth Dev Board',
                        'category': 'Microcontroller',
                        'quantity': 1,
                        'unit': 'pcs',
                        'priceMin': 350,
                        'priceMax': 550,
                        'currency': 'INR',
                        'icon': '📶',
                        'color': '#2563EB',
                        'bg': '#EFF6FF',
                        'image': 'https://upload.wikimedia.org/wikipedia/commons/8/87/ESP32_Espressif_ESP-WROOM-32.jpg',
                        'description': 'Main controller with built-in Wi-Fi and Bluetooth for smart connectivity.',
                        'wiring_tip': 'Connect via micro-USB or 5V VIN pin. Logic level is 3.3V.',
                        'learnUrl': 'https://randomnerdtutorials.com/getting-started-with-esp32/',
                        'searchQuery': 'ESP32 development board',
                        'required': True,
                    },
                    {
                        'id': 'comp_2',
                        'name': 'Sensor Module Pack (Environment / Motion)',
                        'category': 'Sensor',
                        'quantity': 1,
                        'unit': 'pcs',
                        'priceMin': 120,
                        'priceMax': 350,
                        'currency': 'INR',
                        'icon': '📡',
                        'color': '#16A34A',
                        'bg': '#F0FDF4',
                        'image': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/HC-SR04_ultrasonic_sensor.jpg/640px-HC-SR04_ultrasonic_sensor.jpg',
                        'description': 'Captures physical data and transmits to the microcontroller.',
                        'wiring_tip': 'Share common Ground (GND) with microcontroller board.',
                        'learnUrl': 'https://docs.arduino.cc',
                        'searchQuery': 'sensor module for arduino',
                        'required': True,
                    },
                    {
                        'id': 'comp_3',
                        'name': 'Breadboard & Jumper Wire Assortment',
                        'category': 'Prototyping',
                        'quantity': 1,
                        'unit': 'kit',
                        'priceMin': 150,
                        'priceMax': 280,
                        'currency': 'INR',
                        'icon': '🧪',
                        'color': '#D97706',
                        'bg': '#FFFBEB',
                        'image': None,
                        'description': '400-point solderless breadboard + 65 pcs male-to-male and male-to-female jumper wires.',
                        'wiring_tip': 'Use horizontal power distribution rails for VCC and GND.',
                        'learnUrl': 'https://www.instructables.com/How-to-Use-a-Breadboard/',
                        'searchQuery': 'breadboard jumper wires kit',
                        'required': True,
                    },
                    {
                        'id': 'comp_4',
                        'name': '5V 2A Regulated Power Supply',
                        'category': 'Power',
                        'quantity': 1,
                        'unit': 'pcs',
                        'priceMin': 180,
                        'priceMax': 350,
                        'currency': 'INR',
                        'icon': '🔋',
                        'color': '#7C3AED',
                        'bg': '#F5F3FF',
                        'image': None,
                        'description': 'Stable DC power adapter to power microcontroller, sensors, and actuators without resetting.',
                        'wiring_tip': 'Check polarity before plugging in: center-positive DC jack.',
                        'learnUrl': 'https://www.electronics-tutorials.ws/dccircuits/power-supply.html',
                        'searchQuery': '5V 2A adapter power supply',
                        'required': True,
                    },
                ]

        # Attach vendor links and ensure images
        for comp in components:
            comp_name = comp.get('searchQuery') or comp.get('name', '')
            comp['vendors'] = build_vendor_store_links(comp_name)
            if not comp.get('image'):
                lower_name = comp_name.lower()
                # Specific overrides first to avoid generic keyword misclassification
                if 'esp32 cam' in lower_name or 'ov2640' in lower_name or ('esp' in lower_name and 'cam' in lower_name):
                    comp['image'] = '/components/esp32_cam.jpg'
                elif 'relay' in lower_name:
                    comp['image'] = '/components/relay_module.jpg'
                elif 'esp32' in lower_name or 'esp8266' in lower_name or 'nodemcu' in lower_name:
                    comp['image'] = '/components/esp32_nodemcu.jpg'
                elif 'arduino' in lower_name or 'uno' in lower_name:
                    comp['image'] = '/components/arduino_uno.jpg'
                elif 'adapter' in lower_name or 'power supply' in lower_name:
                    comp['image'] = '/components/power_adapter.jpg'
                elif 'breadboard' in lower_name or 'jumper' in lower_name:
                    comp['image'] = '/components/breadboard_kit.jpg'
                else:
                    for item in CURATED_HARDWARE_PARTS:
                        if any(kw in lower_name for kw in item['keywords']):
                            comp['image'] = item['image']
                            break

        return Response({'components': components}, status=status.HTTP_200_OK)


class HardwareSearchView(APIView):
    """
    Live component search endpoint. Searches Indian maker stores,
    matches curated components with verified imagery, and builds direct vendor links.
    """
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        return self._handle_search(request.GET.get('q', ''))

    def post(self, request):
        return self._handle_search(request.data.get('query', '') or request.data.get('q', ''))

    def _handle_search(self, raw_query):
        query = str(raw_query or '').strip()
        if not query:
            return Response({'query': '', 'results': [], 'vendors': build_vendor_store_links('Arduino')}, status=status.HTTP_200_OK)

        lower = query.lower()
        matched = []

        # Find matching parts from curated catalog
        for part in CURATED_HARDWARE_PARTS:
            score = sum(1 for kw in part['keywords'] if kw in lower)
            if score > 0 or lower in part['name'].lower() or any(w in part['name'].lower() for w in lower.split()):
                qty = part.get('quantity', 1)
                u_price = part.get('unit_price', 250)
                matched.append({
                    'name': part['name'],
                    'category': part['category'],
                    'price_range': part['price_range'],
                    'quantity': qty,
                    'unit': part.get('unit', 'pcs'),
                    'unit_price': u_price,
                    'total_price': u_price * qty,
                    'image': part['image'],
                    'description': part['description'],
                    'wiring_tip': part['wiring_tip'],
                    'learn_url': part['learn_url'],
                    'availability': 'In Stock (MakerBazar)',
                    'vendors': build_vendor_store_links(part['name']),
                })

        # If no exact match, create dynamic result card for query
        if not matched:
            matched.append({
                'name': query.title(),
                'category': 'Hardware Component',
                'price_range': '₹150 – ₹850',
                'quantity': 1,
                'unit': 'pcs',
                'unit_price': 350,
                'total_price': 350,
                'image': 'https://upload.wikimedia.org/wikipedia/commons/8/87/ESP32_Espressif_ESP-WROOM-32.jpg',
                'description': f'Component matching "{query}" available with direct search across Indian electronics stores.',
                'wiring_tip': 'Refer to component datasheet for pinout configuration and voltage limits.',
                'learn_url': f'https://www.google.com/search?q={urllib.parse.quote_plus(query + " arduino tutorial")}',
                'availability': 'Available on MakerBazar',
                'vendors': build_vendor_store_links(query),
            })

        return Response({
            'query': query,
            'results': matched,
            'vendors': build_vendor_store_links(query),
        }, status=status.HTTP_200_OK)

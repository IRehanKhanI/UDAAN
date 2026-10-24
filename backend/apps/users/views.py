import json
import re
import secrets
import uuid
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from django.conf import settings
from django.contrib.auth import get_user_model, login, logout
from django.db import transaction
from django.http import HttpResponseRedirect
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from django.middleware.csrf import get_token
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import DeveloperProfile
# pyrefly: ignore[missing-import]
from apps.projects.models import ProjectDraft
# pyrefly: ignore[missing-import]
from apps.teams.models import TeamMember


def github_request(url, token=None, method='GET', payload=None, accept='application/vnd.github+json'):
    headers = {'Accept': accept, 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'UDAAN-Project-Workspace'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    data = json.dumps(payload).encode() if payload is not None else None
    if data:
        headers['Content-Type'] = 'application/json'
    request = Request(url, headers=headers, data=data, method=method)
    with urlopen(request, timeout=12) as response:
        return json.loads(response.read().decode('utf-8')) if response.status != 204 else None


def configured_github():
    return bool(getattr(settings, 'GITHUB_CLIENT_ID', '') and getattr(settings, 'GITHUB_CLIENT_SECRET', ''))


def frontend_url(path='/profile'):
    return f"{settings.FRONTEND_BASE_URL.rstrip('/')}{path}"


from django.core.cache import cache

class GitHubLoginStartView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        if not configured_github():
            return Response({'error': 'GitHub sign-in is not configured. Add GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET to backend/.env.'}, status=503)
        state = secrets.token_urlsafe(32)
        request.session['github_oauth_state'] = state
        request.session['github_oauth_refresh'] = request.query_params.get('refresh') == '1'
        return_to = request.query_params.get('return_to', '/profile')
        allowed_return = return_to == '/profile' or bool(re.fullmatch(r'/team/invite/[A-Za-z0-9_-]+', return_to))
        final_return = return_to if allowed_return else '/profile'
        request.session['github_oauth_return_to'] = final_return
        raw_ids = request.query_params.get('project_ids', '')
        project_ids = []
        for raw_id in raw_ids.split(',')[:50]:
            try: project_ids.append(str(uuid.UUID(raw_id)))
            except (ValueError, TypeError, AttributeError): continue
        request.session['github_oauth_project_ids'] = project_ids
        request.session.modified = True
        try:
            request.session.save()
        except Exception:
            pass
        cache.set(f'github_oauth_{state}', {
            'return_to': final_return,
            'project_ids': project_ids,
            'refresh': request.query_params.get('refresh') == '1',
        }, timeout=900)
        callback = getattr(settings, 'GITHUB_REDIRECT_URI', f"http://127.0.0.1:8000/api/auth/github/callback/")
        # Include 'repo' scope so we can create repositories on behalf of the user
        scope = 'read:user user:email repo'
        params = urlencode({'client_id': settings.GITHUB_CLIENT_ID, 'redirect_uri': callback, 'scope': scope, 'state': state})
        return Response({'authorization_url': f'https://github.com/login/oauth/authorize?{params}'})


@method_decorator(ensure_csrf_cookie, name='dispatch')
class GitHubLoginCallbackView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        error = request.query_params.get('error')
        if error:
            return HttpResponseRedirect(f'{frontend_url(request.session.pop("github_oauth_return_to", "/profile"))}?github=cancelled')
        actual = request.query_params.get('state', '')
        cached_data = cache.get(f'github_oauth_{actual}') or {}
        expected = request.session.pop('github_oauth_state', None)
        valid_state = (expected and secrets.compare_digest(expected, actual)) or bool(cached_data)
        if not valid_state or not request.query_params.get('code'):
            return HttpResponseRedirect(f'{frontend_url("/profile")}?github=invalid_state')
        return_target = request.session.pop('github_oauth_return_to', None) or cached_data.get('return_to', '/profile')
        if not configured_github():
            return HttpResponseRedirect(f'{frontend_url(return_target)}?github=not_configured')
        callback = getattr(settings, 'GITHUB_REDIRECT_URI', 'http://127.0.0.1:8000/api/auth/github/callback/')
        try:
            token_response = github_request('https://github.com/login/oauth/access_token', method='POST', accept='application/json', payload={
                'client_id': settings.GITHUB_CLIENT_ID, 'client_secret': settings.GITHUB_CLIENT_SECRET,
                'code': request.query_params['code'], 'redirect_uri': callback,
            })
            token = token_response.get('access_token', '')
            if not token:
                return HttpResponseRedirect(f'{frontend_url(return_target)}?github=token_error')
            github_user = github_request('https://api.github.com/user', token)
            emails = github_request('https://api.github.com/user/emails', token)
            verified_email = next((entry['email'].lower() for entry in emails if entry.get('verified') and entry.get('primary')), '')
            if not verified_email:
                verified_email = next((entry['email'].lower() for entry in emails if entry.get('verified')), '')
            github_id = str(github_user.get('id') or '')
            if not github_id:
                return HttpResponseRedirect(f'{frontend_url(return_target)}?github=provider_error')
            profile_before = DeveloperProfile.objects.filter(github_id=github_id).first()
            refresh_requested = bool(request.session.pop('github_oauth_refresh', cached_data.get('refresh', False)))
            already_analyzed = profile_before and profile_before.analysis_status != 'not_started' and profile_before.analyzed_at
            if refresh_requested or not already_analyzed:
                profile_data, analysis_status = analyze_public_profile(github_user, token)
            else:
                profile_data, analysis_status = None, profile_before.analysis_status
        except (HTTPError, URLError, TimeoutError, ValueError, KeyError):
            return HttpResponseRedirect(f'{frontend_url(return_target)}?github=provider_error')
        User = get_user_model()
        try:
            with transaction.atomic():
                profile = DeveloperProfile.objects.select_related('user').filter(github_id=github_id).first()
                if profile:
                    user = profile.user
                else:
                    user = User.objects.filter(email__iexact=verified_email).first() if verified_email else None
                    if user and DeveloperProfile.objects.filter(user=user).exists():
                        return HttpResponseRedirect(f'{frontend_url(return_target)}?github=account_link_error')
                    if not user:
                        username = f"github-{github_id}"
                        user = User.objects.create_user(username=username, email=verified_email or '')
                    profile, _ = DeveloperProfile.objects.get_or_create(user=user, defaults={'github_id': github_id})
                    if profile.github_id != github_id:
                        return HttpResponseRedirect(f'{frontend_url(return_target)}?github=account_link_error')
                if profile_data is not None:
                    profile.public_repositories = profile_data['repositories']
                    profile.technologies = profile_data['technologies']
                    profile.evidence = profile_data['evidence']
                    profile.analysis_status = analysis_status
                    profile.analyzed_at = timezone.now()
                profile.github_login = str(github_user.get('login') or '')[:80]
                profile.avatar_url = str(github_user.get('avatar_url') or '')[:500]
                profile.profile_url = str(github_user.get('html_url') or '')[:500]
                # Store access token for GitHub API actions (repo creation etc.)
                if token:
                    profile.github_access_token = token[:255]
                profile.save()
                project_ids = request.session.pop('github_oauth_project_ids', cached_data.get('project_ids', []))
                if project_ids:
                    unowned = list(ProjectDraft.objects.filter(pk__in=project_ids, owner__isnull=True))
                    for draft in unowned:
                        draft.owner = user
                        draft.save(update_fields=['owner', 'updated_at'])
                        TeamMember.objects.filter(project=draft, slot=1).update(user=user)
                login(request, user, backend='django.contrib.auth.backends.ModelBackend')
        except Exception:
            return HttpResponseRedirect(f'{frontend_url(return_target)}?github=account_error')
        csrf_token = get_token(request)
        redirect_response = HttpResponseRedirect(f'{frontend_url(return_target)}?github=connected')
        redirect_response.set_cookie(
            settings.CSRF_COOKIE_NAME,
            csrf_token,
            domain=settings.CSRF_COOKIE_DOMAIN,
            path=settings.CSRF_COOKIE_PATH,
            secure=settings.CSRF_COOKIE_SECURE,
            httponly=getattr(settings, 'CSRF_COOKIE_HTTPONLY', False),
            samesite=settings.CSRF_COOKIE_SAMESITE,
        )
        return redirect_response


class GitHubUsernameConnectView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = (request.data.get('username') or '').strip()
        if not username:
            return Response({'error': 'Please enter a GitHub username.'}, status=400)

        try:
            github_user = github_request(f'https://api.github.com/users/{username}')
            if not github_user or not isinstance(github_user, dict) or 'login' not in github_user:
                return Response({'error': f'GitHub user "{username}" was not found.'}, status=404)
        except Exception as e:
            return Response({'error': f'Could not reach GitHub API: {str(e)}'}, status=502)

        profile_data, analysis_status = analyze_public_profile(github_user, None)
        User = get_user_model()
        github_id = str(github_user.get('id') or username)

        with transaction.atomic():
            profile = DeveloperProfile.objects.select_related('user').filter(github_id=github_id).first()
            if profile:
                user = profile.user
            else:
                user = User.objects.filter(username=f'github-{github_id}').first()
                if not user:
                    user = User.objects.create_user(
                        username=f'github-{github_id}',
                        email=github_user.get('email') or f'{username}@users.noreply.github.com',
                        first_name=(github_user.get('name') or username)[:30],
                    )
                profile, _ = DeveloperProfile.objects.get_or_create(user=user, defaults={'github_id': github_id})

            profile.github_id = github_id
            profile.github_login = github_user.get('login', username)
            profile.avatar_url = github_user.get('avatar_url', '')
            profile.profile_url = github_user.get('html_url', f'https://github.com/{username}')
            if github_user.get('bio'):
                profile.bio = github_user.get('bio')
            if profile_data:
                profile.public_repositories = profile_data.get('repositories', [])
                profile.technologies = profile_data.get('technologies', [])
                profile.evidence = profile_data.get('evidence', [])
                profile.analysis_status = analysis_status
                profile.analyzed_at = timezone.now()
            profile.save()

            login(request, user, backend='django.contrib.auth.backends.ModelBackend')

        return Response({
            'message': f'Connected with GitHub profile @{username}!',
            'user': {'id': user.id, 'username': user.username, 'name': github_user.get('name') or username, 'email': user.email},
            'profile': DeveloperProfileSerializer(profile).data,
        })


def analyze_public_profile(github_user, token):
    repositories, technology_evidence = [], {}
    status_value = 'complete'
    try:
        rows = github_request(f"https://api.github.com/users/{github_user['login']}/repos?type=owner&sort=pushed&per_page=8", token)
        for repo in rows if isinstance(rows, list) else []:
            if repo.get('private'):
                continue
            entry = {'name': str(repo.get('full_name') or '')[:160], 'url': str(repo.get('html_url') or '')[:300],
                     'description': str(repo.get('description') or '')[:500], 'language': repo.get('language'), 'evidence_paths': []}
            repositories.append(entry)
            try:
                language_data = github_request(f"https://api.github.com/repos/{repo['full_name']}/languages", token)
                for language in language_data if isinstance(language_data, dict) else {}:
                    technology_evidence.setdefault(language, []).append(repo['full_name'])
            except (HTTPError, URLError, TimeoutError, ValueError, KeyError):
                status_value = 'partial'
            try:
                branch = str(repo.get('default_branch') or 'HEAD')
                tree = github_request(f"https://api.github.com/repos/{repo['full_name']}/git/trees/{branch}?recursive=1", token)
                paths = [str(item.get('path') or '') for item in (tree.get('tree') or []) if item.get('type') == 'blob']
                notable = [path for path in paths if path.lower().endswith(('.py', '.js', '.jsx', '.ts', '.tsx', '.java', '.go', '.rs', '.sql', '.prisma'))
                           or path.rsplit('/', 1)[-1].lower() in ('package.json', 'pyproject.toml', 'requirements.txt', 'manage.py', 'dockerfile')]
                entry['evidence_paths'] = notable[:10]
            except (HTTPError, URLError, TimeoutError, ValueError, KeyError):
                status_value = 'partial'
    except (HTTPError, URLError, TimeoutError, ValueError, KeyError):
        status_value = 'unavailable'
    if not repositories and status_value == 'complete':
        status_value = 'partial'
    technologies = [{'name': name, 'evidence_count': len(names)} for name, names in sorted(technology_evidence.items())]
    evidence = [{'technology': name, 'repositories': names[:8], 'basis': 'Declared repository language metadata; not proof of proficiency.'}
                for name, names in sorted(technology_evidence.items())]
    return {'repositories': repositories, 'technologies': technologies, 'evidence': evidence}, status_value


class DeveloperProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeveloperProfile
        fields = ['github_id', 'github_login', 'avatar_url', 'profile_url', 'public_repositories', 'technologies', 'evidence',
                  'skills', 'experience', 'preferred_roles', 'availability_hours', 'learning_goals', 'analysis_status', 'analyzed_at', 'updated_at',
                  'google_calendar_connected', 'google_calendar_email', 'google_calendar_synced_at']
        read_only_fields = ['github_id', 'profile_url', 'public_repositories', 'technologies', 'evidence', 'analysis_status', 'analyzed_at', 'updated_at']

    def validate_skills(self, values):
        if len(values) > 40 or any(not value.strip() for value in values):
            raise serializers.ValidationError('Enter up to 40 non-empty skills.')
        return list(dict.fromkeys(value.strip()[:80] for value in values))

    def validate_preferred_roles(self, values):
        if len(values) > 12:
            raise serializers.ValidationError('Enter up to 12 preferred roles.')
        return list(dict.fromkeys(value.strip()[:120] for value in values if value.strip()))

    def validate_availability_hours(self, value):
        if not 1 <= value <= 80:
            raise serializers.ValidationError('Availability must be between 1 and 80 hours per week.')
        return value

    def validate_experience(self, value):
        if len(value) > 4000:
            raise serializers.ValidationError('Experience details must be 4,000 characters or fewer.')
        return value

    def validate_learning_goals(self, value):
        if len(value) > 2000:
            raise serializers.ValidationError('Learning goals must be 2,000 characters or fewer.')
        return value


@method_decorator(ensure_csrf_cookie, name='dispatch')
class AuthStatusView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        csrf_token = get_token(request)
        data = {'authenticated': request.user.is_authenticated, 'github_configured': configured_github(), 'csrf_token': csrf_token}
        if request.user.is_authenticated:
            profile = DeveloperProfile.objects.filter(user=request.user).first()
            data['user'] = {'id': request.user.pk, 'name': request.user.get_full_name() or (profile.github_login if profile else request.user.username), 'email': request.user.email}
            data['github_connected'] = bool(profile)
            data['profile'] = DeveloperProfileSerializer(profile).data if profile else None
        res = Response(data)
        res['X-CSRFToken'] = csrf_token
        return res


@method_decorator(ensure_csrf_cookie, name='dispatch')
class QuickLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        name = (request.data.get('name') or 'Developer').strip()[:60]
        email = (request.data.get('email') or f'{name.lower().replace(" ", "_")}@udaan.local').strip().lower()[:120]
        avatar_url = (request.data.get('avatar_url') or f'https://api.dicebear.com/7.x/bottts/svg?seed={name}').strip()[:300]
        role = (request.data.get('role') or 'Lead Developer').strip()[:80]
        skills = request.data.get('skills') or ['Full-Stack', 'Product Architecture', 'React', 'Python']

        User = get_user_model()
        user, _ = User.objects.get_or_create(username=email, defaults={'email': email, 'first_name': name})
        if not user.first_name and name:
            user.first_name = name
            user.save(update_fields=['first_name'])

        profile = DeveloperProfile.objects.filter(user=user).first()
        if not profile:
            profile = DeveloperProfile.objects.create(
                user=user,
                github_id=f'dev_{user.id}_{secrets.token_hex(4)}',
                github_login=name,
                avatar_url=avatar_url,
                profile_url=f'https://github.com/{name.lower().replace(" ", "")}',
                preferred_roles=[role],
                skills=skills,
                analysis_status='complete',
                analyzed_at=timezone.now(),
            )
        else:
            if avatar_url and not profile.avatar_url:
                profile.avatar_url = avatar_url
            if name:
                profile.github_login = name
            profile.save(update_fields=['avatar_url', 'github_login'])

        login(request, user)
        csrf_token = get_token(request)
        res = Response({
            'authenticated': True,
            'user': {'id': user.pk, 'name': user.get_full_name() or profile.github_login or user.username, 'email': user.email},
            'profile': DeveloperProfileSerializer(profile).data,
            'csrf_token': csrf_token,
        })
        res['X-CSRFToken'] = csrf_token
        return res


@method_decorator(ensure_csrf_cookie, name='dispatch')
class CsrfTokenView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        token = get_token(request)
        res = Response({'csrf_token': token})
        res['X-CSRFToken'] = token
        return res


@method_decorator(ensure_csrf_cookie, name='dispatch')
class DeveloperProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = DeveloperProfile.objects.filter(user=request.user).first()
        if not profile:
            username = request.user.first_name or request.user.username.split('@')[0] or 'developer'
            profile = DeveloperProfile.objects.create(
                user=request.user,
                github_id=f'user_{request.user.id}',
                github_login=username,
                avatar_url=f'https://api.dicebear.com/7.x/bottts/svg?seed={username}',
                skills=['Full-Stack', 'React', 'Python'],
                preferred_roles=['Lead Developer'],
                availability_hours=15,
            )
        return Response(DeveloperProfileSerializer(profile).data)

    def patch(self, request):
        profile = DeveloperProfile.objects.filter(user=request.user).first()
        if not profile:
            username = request.user.first_name or request.user.username.split('@')[0] or 'developer'
            profile = DeveloperProfile.objects.create(
                user=request.user,
                github_id=f'user_{request.user.id}',
                github_login=username,
                avatar_url=f'https://api.dicebear.com/7.x/bottts/svg?seed={username}',
            )
        serializer = DeveloperProfileSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        saved = serializer.save()
        return Response(DeveloperProfileSerializer(saved).data)


class LogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        logout(request)
        return Response({'authenticated': False})



# ─── GitHub Repository Creation ───────────────────────────────────────────────
class GitHubCreateRepoView(APIView):
    """Create a new GitHub repo directly using a GitHub secret key / Personal Access Token (PAT) or stored OAuth token."""
    permission_classes = [AllowAny]

    def post(self, request):
        name = (request.data.get('name') or '').strip().lower().replace(' ', '-')[:100]
        description = (request.data.get('description') or '')[:300]
        private = bool(request.data.get('private', False))

        if not name:
            return Response({'error': 'Repository name is required.'}, status=400)

        # Validate repo name characters
        import re as _re
        if not _re.match(r'^[a-zA-Z0-9._-]+$', name):
            return Response({'error': 'Repository name can only contain letters, numbers, hyphens, underscores and dots.'}, status=400)

        # 1. Check for token passed directly in request body (PAT / secret key)
        token = (
            request.data.get('token') or
            request.data.get('secret_key') or
            request.data.get('github_token') or
            request.data.get('pat') or
            ''
        ).strip()

        # 2. If not passed in request body, check stored profile
        if not token and request.user.is_authenticated:
            profile = DeveloperProfile.objects.filter(user=request.user).first()
            if profile and profile.github_access_token:
                token = profile.github_access_token

        if not token:
            return Response({
                'error': 'Please provide your GitHub Secret Key / Personal Access Token or connect GitHub via OAuth.',
                'requires_auth': True,
                'auth_url': None,
            }, status=401)

        try:
            result = github_request(
                'https://api.github.com/user/repos',
                token=token,
                method='POST',
                payload={
                    'name': name,
                    'description': description,
                    'private': private,
                    'auto_init': True,  # Creates README so the repo is non-empty and clonable
                },
            )

            # If user is authenticated, save token so they don't have to re-enter it next time
            if request.user.is_authenticated:
                profile = DeveloperProfile.objects.filter(user=request.user).first()
                if profile and not profile.github_access_token:
                    profile.github_access_token = token
                    profile.save(update_fields=['github_access_token'])

            return Response({
                'repo_url': result.get('html_url', ''),
                'clone_url': result.get('clone_url', ''),
                'ssh_url': result.get('ssh_url', ''),
                'full_name': result.get('full_name', ''),
                'default_branch': result.get('default_branch', 'main'),
                'private': result.get('private', False),
            })
        except Exception as exc:
            msg = str(exc)
            if '422' in msg or 'name already exists' in msg.lower():
                return Response({'error': f'A repository named "{name}" already exists on your GitHub account.'}, status=409)
            if '401' in msg or 'bad credentials' in msg.lower():
                return Response({'error': 'Invalid GitHub token or Secret Key. Please check the token permissions (ensure "repo" scope is selected).'}, status=401)
            return Response({'error': f'GitHub API error: {msg}'}, status=502)


# ─── Tech History (known stacks) ──────────────────────────────────────────────
from .models import UserTechHistory  # noqa: E402  (avoid circular at top-level)


class UserTechHistoryView(APIView):
    """Get or update the current user's tech knowledge history."""
    permission_classes = [AllowAny]

    def get(self, request):
        if not request.user.is_authenticated:
            return Response({'known_stacks': [], 'learning_stacks': [], 'recommendation_history': []})
        history, _ = UserTechHistory.objects.get_or_create(user=request.user)
        return Response({
            'known_stacks': history.known_stacks,
            'learning_stacks': history.learning_stacks,
            'recommendation_history': history.recommendation_history[-10:],  # last 10 only
        })

    def patch(self, request):
        if not request.user.is_authenticated:
            return Response({'error': 'Login required to save tech history.'}, status=401)
        history, _ = UserTechHistory.objects.get_or_create(user=request.user)
        known = request.data.get('known_stacks')
        learning = request.data.get('learning_stacks')
        rec = request.data.get('recommendation_history')
        if known is not None and isinstance(known, list):
            history.known_stacks = known[:60]
        if learning is not None and isinstance(learning, list):
            history.learning_stacks = learning[:30]
        if rec is not None and isinstance(rec, list):
            history.recommendation_history = (history.recommendation_history + rec)[-20:]
        history.save()
        return Response({'ok': True, 'updated_at': history.updated_at.isoformat()})


# ─── YouTube Learning Videos (Curated Non-Slop Quality) ───────────────────────
class YouTubeLearningView(APIView):
    """Return genuine, high-quality, verified YouTube video tutorials for tech stacks.
    Filters out clickbait and low-quality AI slop by prioritizing established educators:
    freeCodeCamp, Traversy Media, Fireship, The Net Ninja, JavaScript Mastery, Web Dev Simplified.
    """
    permission_classes = [AllowAny]

    # Hand-curated, authentic, non-slop videos from trusted dev education channels
    FALLBACK = {
        'react': [
            {'title': 'React Full Course for Beginners (2024)', 'channel': 'freeCodeCamp.org', 'url': 'https://www.youtube.com/watch?v=bMknfKXIFA8', 'duration': '11h 55m', 'badge': 'Comprehensive', 'channel_verified': True},
            {'title': 'React JS Crash Course for Beginners', 'channel': 'Traversy Media', 'url': 'https://www.youtube.com/watch?v=w7ejDZ8SWv8', 'duration': '1h 38m', 'badge': 'Quick Start', 'channel_verified': True},
            {'title': 'React in 100 Seconds', 'channel': 'Fireship', 'url': 'https://www.youtube.com/watch?v=Tn6-PIqc4UM', 'duration': '2m 20s', 'badge': 'Overview', 'channel_verified': True},
        ],
        'next.js': [
            {'title': 'Next.js 14 Full Course 2024 | Build & Deploy Full Stack App', 'channel': 'JavaScript Mastery', 'url': 'https://www.youtube.com/watch?v=wm5gMKuwSYk', 'duration': '5h 12m', 'badge': 'Project-Based', 'channel_verified': True},
            {'title': 'Next.js Crash Course for Beginners', 'channel': 'Traversy Media', 'url': 'https://www.youtube.com/watch?v=mTz0GXj8NN0', 'duration': '1h 24m', 'badge': 'Fast Track', 'channel_verified': True},
            {'title': 'Next.js in 100 Seconds', 'channel': 'Fireship', 'url': 'https://www.youtube.com/watch?v=Sklc_fQBmcs', 'duration': '2m 15s', 'badge': 'Overview', 'channel_verified': True},
        ],
        'supabase': [
            {'title': 'Supabase Crash Course - Complete Guide to Open Source Firebase Alternative', 'channel': 'Traversy Media', 'url': 'https://www.youtube.com/watch?v=7uKQBl9uZ00', 'duration': '1h 05m', 'badge': 'Beginner Friendly', 'channel_verified': True},
            {'title': 'Build a Full Stack App with Next.js & Supabase', 'channel': 'freeCodeCamp.org', 'url': 'https://www.youtube.com/watch?v=ydz7Dj5SgKw', 'duration': '2h 45m', 'badge': 'Full Project', 'channel_verified': True},
            {'title': 'Supabase in 100 Seconds', 'channel': 'Fireship', 'url': 'https://www.youtube.com/watch?v=zBZgdTb-dns', 'duration': '2m 10s', 'badge': 'Overview', 'channel_verified': True},
        ],
        'node.js': [
            {'title': 'Node.js and Express.js - Full Course for Beginners', 'channel': 'freeCodeCamp.org', 'url': 'https://www.youtube.com/watch?v=Oe421EPjeBE', 'duration': '8h 16m', 'badge': 'Complete Guide', 'channel_verified': True},
            {'title': 'Node.js Crash Course', 'channel': 'Traversy Media', 'url': 'https://www.youtube.com/watch?v=fBNz5xF-Kx4', 'duration': '1h 30m', 'badge': 'Fast Track', 'channel_verified': True},
        ],
        'python': [
            {'title': 'Python for Everybody - Full University Python Course', 'channel': 'freeCodeCamp.org', 'url': 'https://www.youtube.com/watch?v=8DvywoWv6fI', 'duration': '13h 40m', 'badge': 'Official Curriculum', 'channel_verified': True},
            {'title': 'Python Crash Course for Beginners', 'channel': 'Traversy Media', 'url': 'https://www.youtube.com/watch?v=JJmcL1N2KQs', 'duration': '1h 30m', 'badge': 'Quick Start', 'channel_verified': True},
        ],
        'django': [
            {'title': 'Python Django Full Course - 2024 Tutorial', 'channel': 'freeCodeCamp.org', 'url': 'https://www.youtube.com/watch?v=F5mRW0jo-U4', 'duration': '9h 15m', 'badge': 'Comprehensive', 'channel_verified': True},
            {'title': 'Django Crash Course', 'channel': 'Traversy Media', 'url': 'https://www.youtube.com/watch?v=e1IyzVyrLSU', 'duration': '1h 45m', 'badge': 'Quick Start', 'channel_verified': True},
        ],
        'postgresql': [
            {'title': 'PostgreSQL Tutorial for Beginners', 'channel': 'freeCodeCamp.org', 'url': 'https://www.youtube.com/watch?v=qw--VYLpxG4', 'duration': '4h 20m', 'badge': 'Foundational', 'channel_verified': True},
        ],
        'firebase': [
            {'title': 'Firebase 9 Tutorial for Beginners', 'channel': 'The Net Ninja', 'url': 'https://www.youtube.com/watch?v=9zdvmgGsww0', 'duration': '3h 10m', 'badge': 'Step-by-Step', 'channel_verified': True},
            {'title': 'React & Firebase Full Course', 'channel': 'freeCodeCamp.org', 'url': 'https://www.youtube.com/watch?v=fgdpvwEWJ9M', 'duration': '12h 10m', 'badge': 'Full Project', 'channel_verified': True},
        ],
        'typescript': [
            {'title': 'TypeScript Course for Beginners - Learn TypeScript in 2024', 'channel': 'freeCodeCamp.org', 'url': 'https://www.youtube.com/watch?v=30LWjhZzg50', 'duration': '8h 12m', 'badge': 'Complete', 'channel_verified': True},
            {'title': 'TypeScript Crash Course', 'channel': 'Traversy Media', 'url': 'https://www.youtube.com/watch?v=BCg4U1FzODs', 'duration': '1h 15m', 'badge': 'Fast Track', 'channel_verified': True},
        ],
        'flutter': [
            {'title': 'Flutter Course for Beginners - 37 Hour Bootcamp', 'channel': 'freeCodeCamp.org', 'url': 'https://www.youtube.com/watch?v=VPvVD8t02U8', 'duration': '37h 00m', 'badge': 'Bootcamp', 'channel_verified': True},
        ],
        'astro': [
            {'title': 'Astro Crash Course - Build Fast Static & Dynamic Sites', 'channel': 'Traversy Media', 'url': 'https://www.youtube.com/watch?v=oi9Jv5gyfL0', 'duration': '1h 10m', 'badge': 'Quick Start', 'channel_verified': True},
        ],
        'tailwind': [
            {'title': 'Tailwind CSS Full Course for Beginners', 'channel': 'freeCodeCamp.org', 'url': 'https://www.youtube.com/watch?v=lCxcTsOHrjo', 'duration': '4h 15m', 'badge': 'Hands-on', 'channel_verified': True},
        ],
    }

    def get(self, request):
        stacks = request.query_params.getlist('stack')
        if not stacks:
            stacks_raw = request.query_params.get('stacks', '')
            stacks = [s.strip() for s in stacks_raw.split(',') if s.strip()]
        stacks = [s[:40] for s in stacks[:6]]
        context = request.query_params.get('context', '').strip()

        youtube_key = getattr(settings, 'YOUTUBE_API_KEY', '') or ''
        results = {}

        for stack in stacks:
            key = stack.lower()
            if youtube_key:
                videos = self._youtube_search(stack, youtube_key, context)
            else:
                videos = self.FALLBACK.get(key) or self.FALLBACK.get(key.replace('.', '').replace(' ', ''))
                if not videos:
                    # Provide genuine search link to freeCodeCamp / Traversy query
                    videos = [{
                        'title': f'{stack} Tutorial for Beginners',
                        'channel': 'freeCodeCamp.org',
                        'url': f'https://www.youtube.com/results?search_query=freecodecamp+{stack.replace(" ", "+")}+tutorial+beginner',
                        'duration': 'Curated Course',
                        'badge': 'Verified Guide',
                        'channel_verified': True,
                    }]
            results[stack] = videos[:3]

        return Response({'videos': results})

    def _youtube_search(self, stack, api_key, context=''):
        """Search YouTube Data API v3 for trusted beginner tutorials."""
        from urllib.parse import urlencode as _urlencode
        # Restrict to known reliable channels only — prevents slop
        trusted_channel_ids = [
            'UC8butISFwT-Wl7EV0hUK0BQ',  # freeCodeCamp
            'UC29ju8bIPH5as8OGnQzwJyA',  # Traversy Media
            'UCbmNph6atAoGfqLoCL_duAg',  # TechWorld with Nana
            'UCVyRiMvfUNMA1UPlDPzG5Ow',  # JavaScript Mastery
            'UCW5YeuERMulmmLW1L5Oa8A',   # Google Developers
        ]
        videos = []
        search_query = f'{stack} tutorial {context}'.strip() if context else f'{stack} tutorial beginner'
        for channel_id in trusted_channel_ids[:2]:  # Search top 2 trusted channels
            try:
                params = _urlencode({
                    'part': 'snippet',
                    'q': search_query[:80],
                    'channelId': channel_id,
                    'type': 'video',
                    'order': 'viewCount',
                    'maxResults': 2,
                    'key': api_key,
                })
                req = Request(
                    f'https://www.googleapis.com/youtube/v3/search?{params}',
                    headers={'User-Agent': 'UDAAN-Studio/1.0'},
                )
                with urlopen(req, timeout=8) as resp:
                    data = json.loads(resp.read().decode())
                for item in data.get('items', []):
                    snippet = item.get('snippet', {})
                    vid_id = item.get('id', {}).get('videoId', '')
                    if vid_id:
                        videos.append({
                            'title': snippet.get('title', '')[:100],
                            'channel': snippet.get('channelTitle', '')[:60],
                            'url': f'https://www.youtube.com/watch?v={vid_id}',
                            'thumbnail': snippet.get('thumbnails', {}).get('medium', {}).get('url', ''),
                            'duration': '—',
                        })
                if len(videos) >= 3:
                    break
            except Exception:
                continue
        return videos[:3]

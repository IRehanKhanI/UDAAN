import uuid

from django.conf import settings
from django.db import models


class ProjectDraft(models.Model):
    """Persisted planning draft. User ownership is nullable until auth is wired in."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name='project_drafts',
    )
    idea = models.TextField()
    project_type = models.CharField(max_length=32)
    attachment = models.JSONField(null=True, blank=True, default=None)
    understanding = models.JSONField(default=dict, blank=True)
    workflow = models.JSONField(default=dict, blank=True)
    business_model = models.JSONField(default=dict, blank=True)
    current_stage = models.CharField(max_length=32, default='understanding')
    start_date = models.DateField(null=True, blank=True)
    deadline = models.DateField(null=True, blank=True)
    team_size = models.PositiveIntegerField(null=True, blank=True, default=1)
    weekly_hours = models.PositiveIntegerField(null=True, blank=True, default=20)
    schedule_metadata = models.JSONField(default=dict, blank=True)
    xp_points = models.PositiveIntegerField(default=0)
    xp_level = models.CharField(max_length=64, default='Level 1: Idea Shaped')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return f'{self.project_type} draft {self.pk}'


class ProjectStageGeneration(models.Model):
    STAGES = [('research', 'Research'), ('feasibility', 'Feasibility'), ('flight_plan', 'Flight plan')]
    STATUSES = [
        ('not_started', 'Not started'), ('queued', 'Queued'), ('generating', 'Generating'), ('completed', 'Completed'),
        ('failed', 'Failed'), ('stale', 'Stale'),
    ]

    project = models.ForeignKey(ProjectDraft, on_delete=models.CASCADE, related_name='stage_generations')
    stage = models.CharField(max_length=24, choices=STAGES)
    status = models.CharField(max_length=16, choices=STATUSES, default='not_started')
    input_hash = models.CharField(max_length=64)
    target_hash = models.CharField(max_length=64)
    manually_edited = models.BooleanField(default=False)
    has_generated_result = models.BooleanField(default=False)
    rerun_requested = models.BooleanField(default=False)
    attempts = models.PositiveSmallIntegerField(default=0)
    error = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['project', 'stage'], name='unique_project_stage_generation')]
        indexes = [models.Index(fields=['status', 'created_at'], name='stagegen_status_created_idx')]

    def __str__(self):
        return f'{self.project_id} {self.stage} ({self.status})'


class ProjectRepository(models.Model):
    STATUS_CONNECTED = 'connected'
    STATUS_EMPTY = 'empty'
    STATUS_SYNC_FAILED = 'sync_failed'
    STATUS_DISCONNECTED = 'disconnected'

    STATUS_CHOICES = [
        (STATUS_CONNECTED, 'Connected'),
        (STATUS_EMPTY, 'Empty'),
        (STATUS_SYNC_FAILED, 'Sync Failed'),
        (STATUS_DISCONNECTED, 'Disconnected'),
    ]

    project = models.OneToOneField(
        ProjectDraft,
        on_delete=models.CASCADE,
        related_name='repository',
    )
    repo_owner = models.CharField(max_length=160)
    repo_name = models.CharField(max_length=160)
    repo_full_name = models.CharField(max_length=320, blank=True, default='')
    repo_url = models.URLField(max_length=500, blank=True, default='')
    selected_branch = models.CharField(max_length=160, blank=True, default='')
    connection_status = models.CharField(max_length=32, choices=STATUS_CHOICES, default=STATUS_CONNECTED)
    last_synced_sha = models.CharField(max_length=64, blank=True, default='')
    last_synced_at = models.DateTimeField(null=True, blank=True)
    detected_technologies = models.JSONField(default=list, blank=True)
    latest_analysis = models.JSONField(default=dict, blank=True)
    is_empty = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['repo_owner', 'repo_name'], name='projrepo_owner_name_idx'),
        ]

    def save(self, *args, **kwargs):
        if not self.repo_full_name and self.repo_owner and self.repo_name:
            self.repo_full_name = f'{self.repo_owner}/{self.repo_name}'
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.project_id} -> {self.repo_full_name} ({self.connection_status})'


class RoadmapAssessment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        ProjectDraft,
        on_delete=models.CASCADE,
        related_name='roadmap_assessments',
    )
    repository = models.ForeignKey(
        ProjectRepository,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='roadmap_assessments',
    )
    commit_sha = models.CharField(max_length=64, blank=True, default='')
    branch = models.CharField(max_length=160, blank=True, default='')
    summary = models.JSONField(default=dict, blank=True)
    task_assessments = models.JSONField(default=dict, blank=True)
    milestone_assessments = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['project', '-updated_at'], name='roadmap_assess_proj_idx'),
        ]

    def __str__(self):
        return f'{self.project_id} assessment @ {self.commit_sha[:8] or "head"}'


class ProjectLearningState(models.Model):
    """Learning progress and saved resources scoped to one project draft."""
    project = models.OneToOneField(ProjectDraft, on_delete=models.CASCADE, related_name='learning_state')
    step_status = models.JSONField(default=dict, blank=True)
    step_concepts = models.JSONField(default=dict, blank=True)
    saved_resources = models.JSONField(default=list, blank=True)
    recently_viewed = models.JSONField(default=list, blank=True)
    task_feedback = models.JSONField(default=dict, blank=True)
    learning_path = models.JSONField(default=list, blank=True)
    path_task_key = models.CharField(max_length=32, blank=True, default='')
    path_context_hash = models.CharField(max_length=64, blank=True, default='')
    updated_at = models.DateTimeField(auto_now=True)


class MarketingContentItem(models.Model):
    """Saved user-authored marketing drafts, optionally attached to a project."""
    STATUSES = [
        ('draft', 'Draft'),
        ('saved', 'Saved'),
        ('ready_for_review', 'Ready for review'),
        ('approved', 'Approved'),
        ('published', 'Published'),
    ]
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.CASCADE, related_name='marketing_content')
    project = models.ForeignKey(ProjectDraft, null=True, blank=True, on_delete=models.CASCADE, related_name='marketing_content')
    browser_key = models.CharField(max_length=64, blank=True, default='', db_index=True)
    title = models.CharField(max_length=240)
    body = models.TextField()
    content_type = models.CharField(max_length=40)
    platform = models.CharField(max_length=80, blank=True, default='')
    generation_inputs = models.JSONField(default=dict, blank=True)
    version_history = models.JSONField(default=list, blank=True)
    status = models.CharField(max_length=20, choices=STATUSES, default='draft')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']
        indexes = [models.Index(fields=['owner', 'updated_at'], name='mkt_owner_updated_idx')]


class MarketingCampaign(models.Model):
    """Persisted campaign package containing editable copy and generated creative assets."""
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.CASCADE, related_name='marketing_campaigns')
    project = models.ForeignKey(ProjectDraft, null=True, blank=True, on_delete=models.CASCADE, related_name='marketing_campaigns')
    browser_key = models.CharField(max_length=64, blank=True, default='', db_index=True)
    title = models.CharField(max_length=240)
    content_type = models.CharField(max_length=80)
    platform = models.CharField(max_length=80, blank=True, default='')
    brief = models.JSONField(default=dict, blank=True)
    copy = models.JSONField(default=dict, blank=True)
    assets = models.JSONField(default=list, blank=True)
    selected_asset = models.PositiveSmallIntegerField(null=True, blank=True)
    status = models.CharField(max_length=20, default='draft')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']
        indexes = [models.Index(fields=['owner', 'updated_at'], name='mktcamp_owner_updated_idx')]


class MarketRadarReport(models.Model):
    """Source-linked market research report containing competitors, pricing, customer complaints, and experiments."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.OneToOneField(ProjectDraft, on_delete=models.CASCADE, related_name='market_radar')
    summary = models.TextField(blank=True, default='')
    competitors = models.JSONField(default=list, blank=True)
    customer_voice = models.JSONField(default=list, blank=True)
    citations = models.JSONField(default=list, blank=True)
    validation_experiments = models.JSONField(default=list, blank=True)
    raw_snapshots = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return f'MarketRadar for {self.project_id}'


class MindMapGraph(models.Model):
    """Persisted node-link graph for interactive 2D Mind Map and tree visualization."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.OneToOneField(ProjectDraft, on_delete=models.CASCADE, related_name='mindmap_graph')
    nodes = models.JSONField(default=list, blank=True)
    edges = models.JSONField(default=list, blank=True)
    layout_settings = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'MindMap for {self.project_id} ({len(self.nodes)} nodes)'


class TaskVerificationReceipt(models.Model):
    """Audit log of task verifications and XP credits."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(ProjectDraft, on_delete=models.CASCADE, related_name='verification_receipts')
    task_key = models.CharField(max_length=64, db_index=True)
    task_title = models.CharField(max_length=240, blank=True, default='')
    proof_type = models.CharField(max_length=64, default='manual')
    proof_details = models.JSONField(default=dict, blank=True)
    xp_awarded = models.PositiveIntegerField(default=150)
    verified_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-verified_at']

    def __str__(self):
        return f'{self.project_id} -> {self.task_key} (+{self.xp_awarded} XP)'


class BusinessModelRevision(models.Model):
    """Timestamped snapshot of a project's full business model and financial plan."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(ProjectDraft, on_delete=models.CASCADE, related_name='business_model_revisions')
    plan_data = models.JSONField(default=dict)
    summary = models.CharField(max_length=255, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.project_id} revision at {self.created_at}'

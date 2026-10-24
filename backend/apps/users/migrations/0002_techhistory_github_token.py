from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # Tech knowledge history per user — what stacks they actually know
        migrations.CreateModel(
            name='UserTechHistory',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('user', models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='tech_history',
                    to=settings.AUTH_USER_MODEL,
                )),
                # Array of {"name": "React", "confidence": "comfortable", "years": 2, "source": "self"}
                ('known_stacks', models.JSONField(default=list, blank=True,
                    help_text='Tech stacks the user has declared they know')),
                # Array of {"name": "Next.js", "added_at": "...", "project_context": "..."}
                ('learning_stacks', models.JSONField(default=list, blank=True,
                    help_text='Tech stacks currently being learned')),
                # Per-project recommended stacks history: [{"project_id": ..., "recommended": [...], "chosen": [...]}]
                ('recommendation_history', models.JSONField(default=list, blank=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
        ),
        # Store GitHub access token (encrypted at field level via env) for repo creation
        migrations.AddField(
            model_name='developerprofile',
            name='github_access_token',
            field=models.CharField(max_length=255, blank=True, default='',
                help_text='GitHub OAuth access token (stored for repo creation)'),
        ),
    ]

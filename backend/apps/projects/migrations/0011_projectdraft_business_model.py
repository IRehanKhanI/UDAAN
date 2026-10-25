from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('projects', '0010_projectdraft_xp_level_projectdraft_xp_points_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='projectdraft',
            name='business_model',
            field=models.JSONField(blank=True, default=dict),
        ),
    ]

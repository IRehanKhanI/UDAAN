from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('projects', '0012_businessmodelrevision'),
    ]

    operations = [
        migrations.AddField(
            model_name='marketingcontentitem',
            name='version_history',
            field=models.JSONField(blank=True, default=list),
        ),
    ]

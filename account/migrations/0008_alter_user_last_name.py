# Generated by Django 5.1.2 on 2024-10-25 04:14

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("account", "0007_remove_profile_date_joined_and_more"),
    ]

    operations = [
        migrations.AlterField(
            model_name="user",
            name="last_name",
            field=models.CharField(default="", max_length=150),
        ),
    ]

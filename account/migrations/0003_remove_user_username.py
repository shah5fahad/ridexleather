# Generated by Django 5.1.2 on 2024-10-24 03:33

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("account", "0002_alter_user_username"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="user",
            name="username",
        ),
    ]

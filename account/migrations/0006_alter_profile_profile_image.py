# Generated by Django 5.1.2 on 2024-10-25 03:57

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("account", "0005_alter_user_managers_profile_date_joined_and_more"),
    ]

    operations = [
        migrations.AlterField(
            model_name="profile",
            name="profile_image",
            field=models.ImageField(
                blank=True, null=True, upload_to="images/profile_images/"
            ),
        ),
    ]

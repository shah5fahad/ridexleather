# Generated by Django 5.1.2 on 2024-12-01 10:24

import django.core.validators
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("products", "0002_product_discount_percent_websitebanner"),
    ]

    operations = [
        migrations.AlterField(
            model_name="product",
            name="discount_percent",
            field=models.IntegerField(
                default=0,
                validators=[
                    django.core.validators.MinValueValidator(0),
                    django.core.validators.MaxValueValidator(100),
                ],
            ),
        ),
    ]

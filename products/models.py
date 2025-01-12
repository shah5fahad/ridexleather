from django.db import models
from account.models import User
from django.core.validators import MinValueValidator, MaxValueValidator


# Create your models here.
class Category(models.Model):
    name = models.CharField(max_length=255)
    level = models.PositiveIntegerField(default=0)
    parent = models.PositiveIntegerField(blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    date_created = models.DateTimeField(auto_now_add=True)
    date_modified = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, related_name="updated_category", null=True
    )
    
    def __str__(self):
        return self.name


class Product(models.Model):
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, related_name="created_product", null=True
    )
    updated_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, related_name="updated_product", null=True
    )
    category = models.ForeignKey(
        Category, on_delete=models.CASCADE, related_name="product"
    )

    name = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0.00,
        validators=[MinValueValidator(0.00)],
    )
    stock = models.PositiveIntegerField(default=0)
    specifications = models.JSONField(default=dict, null=True, blank=True)
    discount_percent = models.IntegerField(
        default=0, validators=[MinValueValidator(0), MaxValueValidator(100)]
    )

    date_created = models.DateTimeField(auto_now_add=True)
    date_modified = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.name


class ProductImage(models.Model):
    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, related_name="product_image"
    )
    order = models.PositiveIntegerField(default=0)
    product_image = models.ImageField(
        upload_to="images/product_images/", null=True, blank=True
    )


class WebsiteBanner(models.Model):
    name = models.CharField(max_length=100, null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    banner_image = models.ImageField(upload_to="images/banner_images/")
    order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    updated_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, related_name="updated_banner", null=True
    )
    product = models.ForeignKey(
        Product, on_delete=models.SET_NULL, related_name="website_banner", null=True, blank=True
    )
    
    def __str__(self):
        return self.name
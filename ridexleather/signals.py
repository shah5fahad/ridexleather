import os
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.conf import settings
from account.models import Profile
from products.models import Product, ProductImage, Product


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        Profile.objects.create(user=instance)


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def save_user_profile(sender, instance, **kwargs):
    instance.profile.save()


@receiver(post_delete, sender=ProductImage)
def delete_product_image(sender, instance, **kwargs):
    if instance.product_image:
        if os.path.isfile(instance.product_image.path):
            os.remove(instance.product_image.path)


@receiver(post_delete, sender=Product)
def delete_all_product_images(sender, instance, **kwargs):
    for image in instance.product_image.all():
        if image.product_image and os.path.isfile(image.product_image.path):
            os.remove(instance.product_image.path)

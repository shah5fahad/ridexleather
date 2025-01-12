from django.contrib import admin
from products.models import Category, Product, ProductImage, WebsiteBanner


# Register your models here.
class CategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "level"]


class ProductAdmin(admin.ModelAdmin):
    list_display = ["name", "price"]


class ProductImageAdmin(admin.ModelAdmin):
    list_display = ["product"]
    

class WebsiteBannerAdmin(admin.ModelAdmin):
    list_display = ['name', 'is_active']


admin.site.register(Product, ProductAdmin)
admin.site.register(Category, CategoryAdmin)
admin.site.register(ProductImage, ProductImageAdmin)
admin.site.register(WebsiteBanner, WebsiteBannerAdmin)

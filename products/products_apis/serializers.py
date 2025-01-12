from rest_framework.serializers import ModelSerializer
from rest_framework import serializers
from products.models import Product, Category, ProductImage, WebsiteBanner
from orders.models import CartItems


class ProductImageSerializer(ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ["product_image"]


class CategorySerializer(ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "level"]


class ProductSerializer(ModelSerializer):
    product_image = serializers.SerializerMethodField()
    cart_items = serializers.SerializerMethodField()
    category = CategorySerializer()

    class Meta:
        model = Product
        fields = ["id", "name", "price", "discount_percent", "product_image", "specifications", "category", "description", "cart_items"]
        
    def get_product_image(self, obj):
        image_limit = int(self.context.get("image_limit", 1))
        product_images = obj.product_image.all().order_by('order')[:image_limit]
        return ProductImageSerializer(product_images, many=True).data
    
    def get_cart_items(self, obj):
        request = self.context.get("request")
        if request and request.user.id:
            cart_item = CartItems.objects.filter(product=obj, user=request.user)
            if len(cart_item) > 0:
                return [{
                    "id": cart_item[0].id,
                    "quantity": cart_item[0].quantity
                }]
        return []
    
    def __init__(self, *args, **kwargs):
        include = kwargs.pop('include', None)
        exclude = kwargs.pop('exclude', None)
        super().__init__(*args, **kwargs)

        # Dynamically include specified fields
        if include:
            allowed = set(include)
            existing = set(self.fields)
            for field_name in existing - allowed:
                self.fields.pop(field_name)

        # Dynamically exclude specified fields
        if exclude:
            for field_name in exclude:
                self.fields.pop(field_name, None)


class CategoriesListSerializer(ModelSerializer):
    product = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ["id", "name", "level", "parent", "product"]
        
    def get_product(self, obj):
        request = self.context.get("request")
        prod_limit = request.GET.get('prod_limit', 8)
        products = obj.product.all()[:int(prod_limit)]
        serializer = ProductSerializer(products, many=True, exclude=["specifications", "category", "description"], context={"request": request})
        return serializer.data
        

class WebsiteBannersSerializer(ModelSerializer):
    class Meta:
        model = WebsiteBanner
        fields = ["name", "description", "banner_image", "product"]
from rest_framework import serializers
from orders.models import CartItems, Order, OrderItems
from products.products_apis.serializers import ProductSerializer
from products.models import Product

class CartItemsSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True, exclude=["specifications", "category", "description"])
    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(), source="product", write_only=True
    )

    class Meta:
        model = CartItems
        fields = ["id", "product_id", "product", "quantity", "updated_at"]
        read_only_fields = ['user']
        
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


class OrderItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True, exclude=["specifications", "category", "description"])

    class Meta:
        model = OrderItems
        fields = ["id", "product", "quantity", "price"]


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = ["id", "items", "total_amount", "is_paid", "created_at"]


# class PaymentSerializer(serializers.ModelSerializer):
#     class Meta:
#         model = Payment
#         fields = "__all__"

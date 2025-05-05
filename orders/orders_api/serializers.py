from rest_framework import serializers
from orders.models import CartItems, Order, OrderItems, Payment
from products.products_apis.serializers import ProductSerializer
from products.models import Product

class CartItemsSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True, exclude=["specifications", "category", "description"])
    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(), source="product", write_only=True
    )

    class Meta:
        model = CartItems
        fields = ["id", "product_id", "product", "quantity", "updated_at", "cart_product_spec"]
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
    product = ProductSerializer(read_only=True, include=["id", "name", "product_image"])

    class Meta:
        model = OrderItems
        fields = ["id", "product", "quantity", "price", "order_product_spec"]


class OrderSerializer(serializers.ModelSerializer):
    items = serializers.SerializerMethodField()
    payment_date = serializers.SerializerMethodField()
    order_id = serializers.SerializerMethodField()
    ship_status = serializers.CharField(source="get_shipping_status_display", read_only=True)

    class Meta:
        model = Order
        fields = ["id", "items", "total_amount", "payment_date", "shipping_details", "shipping_status", "ship_status", "currency", "updated_at", "order_id"]
        
    def get_payment_date(self, obj):
        return obj.payment.created_at

    def get_order_id(self, obj):
        return obj.payment.razorpay_order_id

    def get_items(self, obj):
        serializer = OrderItemSerializer(obj.order_items.all(), many=True, read_only=True)
        return serializer.data


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = ["id", "order", "razorpay_order_id", "razorpay_payment_id", "amount", "status", "failure_reason", "created_at"]

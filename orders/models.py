from django.db import models
from django.contrib.auth import get_user_model
from products.models import Product

User = get_user_model()


class CartItems(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="carts")
    quantity = models.PositiveIntegerField(default=1)
    updated_at = models.DateTimeField(auto_now=True)
    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, related_name="cart_items"
    )

    def __str__(self):
        return f"{self.quantity} of {self.product.name} in cart {self.user.username}"


class Order(models.Model):
    STATUS_CHOICES = [
        ("PAYMENT_PENDING", "Payment Pending"),
        ("PLACED", "Order Placed"),
        ("PROCESSING", "Processing"),
        ("SHIPPED", "Shipped"),
        ("OUT_FOR_DELIVERY", "Out for Delivery"),
        ("DELIVERED", "Delivered"),
        ("DELAYED", "Delayed"),
        ("RETURNED", "Returned"),
        ("CANCELLED", "Cancelled"),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="orders")
    updated_at = models.DateTimeField(null=True, blank=True)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    shipping_details = models.CharField(max_length=255, blank=True, null=True)
    shipping_id = models.CharField(max_length=255, blank=True, null=True)
    currency = models.CharField(default="USD", max_length=5)
    shipping_status = models.CharField(
        max_length=100, choices=STATUS_CHOICES, default="PAYMENT_PENDING"
    )
    is_paid = models.BooleanField(default=False)

    def __str__(self):
        return f"Order {self.id} by {self.user.username}"


class OrderItems(models.Model):
    order = models.ForeignKey(
        Order, on_delete=models.CASCADE, related_name="order_items"
    )
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    cart_items = models.ForeignKey(
        CartItems, on_delete=models.SET_NULL, blank=True, null=True, related_name="cart"
    )
    quantity = models.PositiveIntegerField(default=1)
    price = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.quantity} of {self.product.name} in Order {self.order.id}"


class Payment(models.Model):
    order = models.OneToOneField(
        Order, on_delete=models.CASCADE, related_name="payment"
    )
    razorpay_order_id = models.CharField(max_length=255, blank=True, null=True)
    razorpay_payment_id = models.CharField(max_length=255, blank=True, null=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(
        max_length=50,
        choices=[("PENDING", "Pending"), ("SUCCESS", "Success"), ("FAILED", "Failed")],
        default="PENDING",
    )
    failure_reason = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Payment for Order {self.order.id} - {self.status}"

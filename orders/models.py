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
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="orders")
    created_at = models.DateTimeField(auto_now_add=True)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    is_paid = models.BooleanField(default=False)

    def __str__(self):
        return f"Order {self.id} by {self.user.username}"


class OrderItems(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="order_items")
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField()
    price = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.quantity} of {self.product.name} in Order {self.order.id}"


# class Payment(models.Model):
#     order = models.OneToOneField(
#         Order, on_delete=models.CASCADE, related_name="payment"
#     )
#     payment_id = models.CharField(max_length=255)
#     payment_method = models.CharField(max_length=255)
#     amount = models.DecimalField(max_digits=10, decimal_places=2)
#     status = models.CharField(
#         max_length=50, choices=[("SUCCESS", "Success"), ("FAILED", "Failed")]
#     )
#     created_at = models.DateTimeField(auto_now_add=True)

#     def __str__(self):
#         return f"Payment for Order {self.order.id}"
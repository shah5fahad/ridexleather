from django.contrib import admin
from .models import CartItems, Order, OrderItems, Payment


class cartItemsAdmin(admin.ModelAdmin):
    list_display = ["product"]
    
class OrderAdmin(admin.ModelAdmin):
    list_display = ["total_amount", "shipping_status"]
    
class OrderItemsAdmin(admin.ModelAdmin):
    list_display = ["product", "quantity", "price"]
    
class PaymentAdmin(admin.ModelAdmin):
    list_display = ["razorpay_order_id", "amount", "status"]
    
admin.site.register(CartItems, cartItemsAdmin)
admin.site.register(Order, OrderAdmin)
admin.site.register(OrderItems, OrderItemsAdmin)
admin.site.register(Payment, PaymentAdmin)

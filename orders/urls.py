from django.urls import path
from orders.orders_api import views

urlpatterns = [
    path('/my_cart', views.CartPageView.as_view(), name='user-cart'),
    path('/cart-items', views.CartItemsView.as_view(), name='cart-items'),
    path('/cart-item/<int:pk>', views.CartItemControllerView.as_view(), name='cart-item-detail'),
    path('/my_wishlist', views.UserWishlistPageView.as_view(), name='user-wishlist'),
    path('/my_order', views.OrderViewPage.as_view(), name='user-order'),
    path("/order", views.OrderView.as_view(), name='create-order'),
    path("/order/<int:order_id>", views.OrderView.as_view(), name='update-order'),
    path("/payment", views.PaymentView.as_view(), name='capture-payment'),
    path("/payment_success", views.PaymentSuccessPageView.as_view(), name='payment-success'),
]

from django.urls import path
from .orders_api.views import CartItemsView, CartItemControllerView, CartPageView, UserWishlistPageView

urlpatterns = [
    path('/my_cart', CartPageView.as_view(), name='user-cart'),
    path('/cart-items', CartItemsView.as_view(), name='cart-items'),
    path('/cart-item/<int:pk>', CartItemControllerView.as_view(), name='cart-item-detail'),
    path('/my_wishlist', UserWishlistPageView.as_view(), name='user-wishlist'),
]

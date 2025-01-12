from rest_framework.views import APIView
from rest_framework.generics import (
    ListCreateAPIView,
    RetrieveUpdateDestroyAPIView,
)
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from orders.models import CartItems
from .serializers import CartItemsSerializer
from ridexleather.common import RedirectJWTAuthentication
from django.shortcuts import render, redirect
from rest_framework import status
from rest_framework.renderers import TemplateHTMLRenderer


class CartPageView(APIView):
    authentication_classes = [RedirectJWTAuthentication]
    permission_classes = [AllowAny]
    template_name = "user_cart.html"

    def get(self, request):
        # Redirect if the user is not authenticated
        if not request.user or request.user.is_anonymous:
            return redirect("/account/login/")
        # Render the login page template on GET request
        return render(request, self.template_name)


class UserWishlistPageView(APIView):
    permission_classes = [AllowAny]
    renderer_classes = [TemplateHTMLRenderer]
    template_name = "user_wishlist.html"

    def get(self, request):
        # Render the category Products page template on GET request
        return render(request, self.template_name)


class CartItemsView(ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = CartItemsSerializer

    def get_queryset(self):
        return CartItems.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class CartItemControllerView(RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = CartItemsSerializer

    def get_queryset(self):
        return CartItems.objects.filter(user=self.request.user)

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        action = request.data.get("action")
        print(action, "action\n\n")

        if action == "increase":
            instance.quantity += 1
        elif action == "decrease" and instance.quantity > 1:
            instance.quantity -= 1
        else:
            return Response(
                {"error": "Invalid action or quantity below 1."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        instance.save()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)
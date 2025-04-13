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
from django.conf import settings
from orders.models import Order, OrderItems, Payment
from products.models import Product
from .serializers import OrderSerializer
from ridexleather.common import StandardResultsSetPagination
from razorpay.errors import BadRequestError, ServerError, GatewayError
from django.db.models import F
from django.core.cache import cache
from account.models import WebsiteGeneralConfiguration
import razorpay


# Initialize Razorpay client
razorpay_client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))


class CartPageView(APIView):
    authentication_classes = [RedirectJWTAuthentication]
    permission_classes = [AllowAny]
    template_name = "user_cart.html"

    def get(self, request):
        # Redirect if the user is not authenticated
        if not request.user or request.user.is_anonymous:
            return redirect("/login")
        # Render the login page template on GET request
        return render(request, self.template_name)


class UserWishlistPageView(APIView):
    permission_classes = [AllowAny]
    renderer_classes = [TemplateHTMLRenderer]
    template_name = "user_wishlist.html"

    def get(self, request):
        # Render the category Products page template on GET request
        return render(request, self.template_name)


class PaymentSuccessPageView(APIView):
    permission_classes = [AllowAny]
    renderer_classes = [TemplateHTMLRenderer]
    template_name = "payment_success_page.html"

    def get(self, request):
        # Render the category Products page template on GET request
        return render(request, self.template_name)
    

    
class OrderViewPage(APIView):
    permission_classes = [AllowAny]
    renderer_classes = [TemplateHTMLRenderer]
    template_name = "user_orders.html"

    def get(self, request):
        # Render the Order Products page template on GET request
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


class OrderView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        orders = Order.objects.filter(user=request.user, is_paid=True).annotate(payment_date=F('payment__created_at')).order_by('-payment_date')

        paginator = StandardResultsSetPagination()
        paginated_orders = paginator.paginate_queryset(orders, request)
        serializer = OrderSerializer(paginated_orders, many=True)
        return paginator.get_paginated_response(serializer.data)

    def post(self, request):
        """
        Create an order, add cart items, generate Razorpay order_id, and store payment data.
        """
        user = request.user
        order_items = request.data.pop("order_items", [])
        currency = request.data.pop("currency", "USD")

        products = Product.objects.filter(id__in=[item['product_id'] for item in order_items])
        product_pricing = {}
        for prod in products:
            currency_rate, decimal_val = 1, 2
            if currency !=  "USD":
                decimal_val = 0
                currency_rate = cache.get(f"currency_rate_{currency}")
                if currency_rate is None:
                    currency_rate = WebsiteGeneralConfiguration.objects.filter(meta_key=currency).values_list("meta_value", flat=True).first()
                    if not currency_rate:
                        currency_rate = 1
            product_price = float(prod.price) * float(currency_rate)
            product_price = round(product_price) if currency != 'USD' else product_price
            product_pricing[prod.id] = round(product_price * ((100 - prod.discount_percent) / 100), decimal_val)

        total_amount = 0
        for idx, item in enumerate(order_items):
            total_amount += product_pricing[item["product_id"]] * item["quantity"]
            order_items[idx]['price'] = product_pricing[item['product_id']]
        # Atleast total_amount should be greater than one.
        if total_amount < 1:
            return Response({"error": "Amount should be atlest one."}, status=status.HTTP_400_BAD_REQUEST)
        # Create order
        order = Order.objects.create(user=user, currency=currency, total_amount=total_amount)
        # Add Order Items
        for item in order_items:
            OrderItems.objects.create(order=order, **item)

        try:
            # Create Razorpay Order
            razorpay_order = razorpay_client.order.create({
                "amount": int(round(total_amount * 100.00,2)),  # Amount in paisa
                "currency": currency,
                "payment_capture": "0"
            })
        # Error handling on razorpay payment
        except BadRequestError as e:
            return Response({"error": f"Payement gateway: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)
        except ServerError as e:
            return Response({"error": f"Payement gateway: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)
        except GatewayError as e:
            return Response({"error": f"Payement gateway: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": "An unexpected error occurred with payment gateway"}, status=status.HTTP_400_BAD_REQUEST)

        # Store Payment Data
        payment = Payment.objects.create(
            order=order,
            razorpay_order_id=razorpay_order["id"],
            amount=total_amount,
            status="PENDING"
        )
        
        data = {
            "order_id": order.id,
            "razorpay_order_id": razorpay_order["id"],
            "amount": total_amount,
            "currency": currency,
            "api_key": settings.RAZORPAY_KEY_ID,
            "name": settings.BRAND_NAME,
            "description": "Complete your purchase of handcrafted leather saddles, bridles, and accessories securely with Razorpay. Your order will be processed immediately upon successful payment confirmation.",
            "prefill": {
                "name": user.first_name + user.last_name,
                "email": user.email,
            }
        }
        contact = getattr(user.profile, 'mobile_number', None)
        if contact:            
            data['prefill']['contact'] = str(contact)

        return Response(data, status=status.HTTP_201_CREATED)

    def put(self, request, order_id):
        """
        Update an existing order's status.
        """
        try:
            order = Order.objects.get(user=request.user, id=order_id)
            serializer = OrderSerializer(order, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data, status=status.HTTP_200_OK)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Order.DoesNotExist:
            return Response({"error": "Order not found"}, status=status.HTTP_404_NOT_FOUND)

    def delete(self, request, order_id):
        """
        Delete an order and its related items.
        """
        try:
            order = Order.objects.get(user=request.user, id=order_id)
            order.delete()
            return Response({"message": "Order deleted"}, status=status.HTTP_204_NO_CONTENT)
        except Order.DoesNotExist:
            return Response({"error": "Order not found"}, status=status.HTTP_404_NOT_FOUND)

class PaymentView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        """
        Capture Razorpay payment and update payment status.
        """
        razorpay_payment_id = request.data.get("razorpay_payment_id")
        razorpay_order_id = request.data.get("razorpay_order_id")
        # Verify payment signature
        result = razorpay_client.utility.verify_payment_signature(request.data)
        if not result:
            return Response({"error": "Payment failed."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            payment = Payment.objects.get(razorpay_order_id=razorpay_order_id)
            payment.razorpay_payment_id = razorpay_payment_id
            payment.status = "SUCCESS"
            payment.save()
            payment.order.is_paid = True
            payment.order.shipping_status = "PLACED"
            payment.order.save()
            # Delete cart items on succesfull order.
            cart_item_ids = payment.order.order_items.values_list('cart_items_id', flat=True)
            if cart_item_ids:
                CartItems.objects.filter(id__in=list(cart_item_ids)).delete()

            return Response({"message": "Payment successful"}, status=status.HTTP_200_OK)

        except Payment.DoesNotExist:
            return Response({"error": "Payment record not found"}, status=status.HTTP_404_NOT_FOUND)
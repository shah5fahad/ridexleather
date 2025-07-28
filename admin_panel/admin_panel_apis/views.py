from django.shortcuts import render, redirect
from rest_framework.views import APIView
from ridexleather.common import RedirectJWTAuthentication, StandardResultsSetPagination
from rest_framework.permissions import AllowAny, IsAdminUser
from orders.orders_api.serializers import OrderSerializer
from rest_framework.filters import OrderingFilter
from rest_framework.generics import ListAPIView
from django_filters.rest_framework import DjangoFilterBackend
from django_filters import rest_framework as filters
from django.db.models.functions import TruncDate
from rest_framework.response import Response
from django.db.models import Count, Sum
from orders.models import Payment
from django.utils import timezone
from account.models import User
from orders.models import Order


class CustomerOrderDetails(APIView):
    authentication_classes = [RedirectJWTAuthentication]
    permission_classes = [AllowAny]
    template_name = "customer_orders.html"

    def get(self, request):
        # Redirect if the user is not authenticated
        if not request.user or request.user.is_anonymous:
            return redirect("/login")
        # Redirect to the homepage if user is not admin
        if request.user and not request.user.is_staff:
            return redirect("/home")
        # Render the login page template on GET request
        return render(request, self.template_name)
    
    
class AdminDashboardDetails(APIView):
    authentication_classes = [RedirectJWTAuthentication]
    permission_classes = [AllowAny]
    template_name = "admin_dashboard.html"

    def get(self, request):
        # Redirect if the user is not authenticated
        if not request.user or request.user.is_anonymous:
            return redirect("/login")
        # Redirect to the homepage if user is not admin
        if request.user and not request.user.is_staff:
            return redirect("/home")
        # Render the login page template on GET request
        return render(request, self.template_name)


class OrderFilter(filters.FilterSet):
    first_name = filters.CharFilter(field_name="user__first_name", lookup_expr="icontains")
    email = filters.CharFilter(field_name="user__email", lookup_expr="iexact")
    order_id = filters.CharFilter(field_name="payment__razorpay_order_id", lookup_expr="iexact")
    shipping_status = filters.CharFilter(
        field_name="shipping_status", lookup_expr="iexact"
    )

    class Meta:
        model = Order
        fields = ["first_name", "email", "order_id", "shipping_status"]


class OrderFilterListView(ListAPIView):
    permission_classes = [IsAdminUser]
    queryset = (
        Order.objects.select_related("user", "payment")
        .prefetch_related("order_items")
        .filter(is_paid=True)
    )
    serializer_class = OrderSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_class = OrderFilter
    ordering_fields = ["payment__created_at"]
    ordering = ["-payment__created_at"]


class UserSignupStatsAPI(APIView):
    permission_classes = [IsAdminUser]
    def get(self, request):
        range_days = request.GET.get("range")
        start_date = request.GET.get("start_date")
        end_date = request.GET.get("end_date")

        if range_days:
            end = timezone.now().date()
            start = end - timezone.timedelta(days=int(range_days))
        elif start_date and end_date:
            start = start_date
            end = end_date
        else:
            start = timezone.now().date() - timezone.timedelta(days=7)
            end = timezone.now().date()

        queryset = User.objects.filter(date_joined__date__range=[start, end])
        data = (
            queryset.annotate(date=TruncDate("date_joined"))
            .values("date")
            .annotate(count=Count("id"))
            .order_by("date")
        )

        labels = [str(entry["date"]) for entry in data]
        counts = [entry["count"] for entry in data]
        return Response({"labels": labels, "data": counts})


class PaymentStatsAPI(APIView):
    permission_classes = [IsAdminUser]
    def get(self, request):
        range_days = request.GET.get("range")
        start_date = request.GET.get("start_date")
        end_date = request.GET.get("end_date")
        print(range_days,start_date,end_date)

        if range_days:
            end = timezone.now().date()
            start = end - timezone.timedelta(days=int(range_days))
        elif start_date and end_date:
            start = start_date
            end = end_date
        else:
            start = timezone.now().date() - timezone.timedelta(days=7)
            end = timezone.now().date()

        queryset = Payment.objects.filter(status='SUCCESS', created_at__date__range=[start, end])
        payments = (
            queryset.annotate(date=TruncDate('created_at'))
            .values('date')
            .annotate(total=Sum('amount_in_usd'))
            .order_by('date')
        )
        labels = [str(entry["date"]) for entry in payments]
        data = [float(entry["total"]) for entry in payments]
        return Response({"labels": labels, "data": data})
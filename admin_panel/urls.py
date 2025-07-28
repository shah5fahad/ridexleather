from django.urls import path
from admin_panel.admin_panel_apis import views


urlpatterns = [
    path("", views.AdminDashboardDetails.as_view(), name="admin_dashboard_details"),
    path("/customer_orders", views.CustomerOrderDetails.as_view(), name="customer_order_details"),
    path("/cutomer_orders_filter", views.OrderFilterListView.as_view(), name="customer_order_filter"),
    path("/user_signup_stats", views.UserSignupStatsAPI.as_view(), name="user_signup_stats"),
    path("/payment_stats", views.PaymentStatsAPI.as_view(), name="payment_stats"),
]
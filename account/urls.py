from rest_framework_simplejwt.views import TokenRefreshView
from django.urls import path
from account.account_apis import views

urlpatterns = [
    path("", views.HomePageView.as_view(), name="home"),
    path(
        "api/token/refresh",
        views.CustomTokenRefreshView.as_view(),
        name="token_refresh",
    ),
    path("register", views.RegisterUserView.as_view(), name="register"),
    path("login", views.LoginView.as_view(), name="login"),
    path("logout", views.LogoutView.as_view(), name="logout"),
    path("profile", views.ProfilePageView.as_view(), name="profile"),
    path("about", views.AboutPageView.as_view(), name="about"),
    path("forget_password", views.ForgetPasswordPageView.as_view(), name="forget_password"),
    path("api/profile", views.ProfileAPIView.as_view(), name="profile_api"),
    path("api/verify_otp", views.VerifyOTPView.as_view(), name="otp_verify"),
    path("api/send_otp", views.SendOTPView.as_view(), name="send_otp"),
    path("api/reset_password", views.ResetPasswordView.as_view(), name="reset_password"),
]

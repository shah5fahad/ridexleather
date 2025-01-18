from rest_framework_simplejwt.views import TokenRefreshView
from django.urls import path
from account.account_apis import views

urlpatterns = [
    path("", views.HomePageView.as_view(), name="home"),
    path("api/test", views.TestingView.as_view(), name="test"),
    path("api/token", views.MyTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path(
        "api/token/refresh",
        views.CustomTokenRefreshView.as_view(),
        name="token_refresh",
    ),
    path("register", views.RegisterUserView.as_view(), name="register"),
    path("login", views.LoginView.as_view(), name="login"),
    path("logout", views.LogoutView.as_view(), name="logout"),
    path("profile", views.ProfilePageView.as_view(), name="profile"),
    path("api/profile", views.ProfileAPIView.as_view(), name="profile_api"),
]

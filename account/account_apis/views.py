from django.shortcuts import render, redirect
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from account.account_apis.serializers import (
    RegisterUser,
    LoginSerializer,
    ProfileSerializer,
)
from account.models import Profile
from rest_framework.views import APIView
from rest_framework.generics import RetrieveUpdateAPIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.renderers import TemplateHTMLRenderer
from rest_framework.exceptions import NotFound
from django.conf import settings
from datetime import datetime, timezone
from ridexleather.common import encodeBase64Json, RedirectJWTAuthentication
from rest_framework import serializers
import os, pyotp

User = get_user_model()
SECURE_TOKEN_MODE = False


class VerifyOTPView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        email = request.data.get('email')
        otp_entered = request.data.get('otp')
        password = request.data.get('password')
        password1 = request.data.get('password1', None)
        try:
            user = User.objects.get(email=email)

            if not user.otp_secret:
                return Response({"error": "OTP not generated"}, status=status.HTTP_400_BAD_REQUEST)
            if password1 and password != password1:
                return Response({"error": "Password mismatch"}, status=status.HTTP_400_BAD_REQUEST)
            totp = pyotp.TOTP(user.otp_secret, interval=900)        # OTP valid only for 15 minutes

            if totp.verify(otp_entered):
                user.is_verified = True  # Activate user
                user.save()
                # Call the existing LoginView.post method
                request.data['user_cred'] = email
                request.data['password'] = password
                return LoginView().post(request)
            else:
                return Response({"error": "Expired or Invalid OTP"}, status=status.HTTP_400_BAD_REQUEST)

        except User.DoesNotExist:
            return Response({"error": "User doesn't exits. Please Signup"}, status=status.HTTP_404_NOT_FOUND)


class CustomTokenRefreshView(TokenRefreshView):
    def post(self, request, *args, **kwargs):
        # Get refresh token from cookies
        refresh_token = request.COOKIES.get("refresh_token")
        if not refresh_token:
            return Response(
                {"error": "Refresh token missing"},
                status=status.HTTP_417_EXPECTATION_FAILED,
            )
        # Inject the refresh token into request data
        request.data["refresh"] = refresh_token
        try:
            # Call the parent class method to get new access token
            response = super().post(request, *args, **kwargs)

            # On successful extract the new access token
            if response.status_code == 200:
                resp = Response(
                    {"message": "Access token updated successfully"},
                    status=status.HTTP_200_OK,
                )
                # Set the new access token in cookies
                resp.set_cookie(
                    key="access_token",
                    value=response.data["access"],
                    samesite="Lax",
                    expires=(
                        datetime.now(timezone.utc)
                        + settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"]
                    ),
                )
                resp.set_cookie(
                    key="refresh_token",
                    value=str(response.data["refresh"]),
                    httponly=True,  # Secure the cookie
                    secure=SECURE_TOKEN_MODE,  # Use HTTPS in production
                    samesite="Lax",  # CSRF protection for cookie
                    expires=(
                        datetime.now(timezone.utc)
                        + settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"]
                    ),  # Set to JWT expiry
                )
                return resp

        except InvalidToken as e:
            # Handle invalid or blacklisted token error
            print(f"InvalidToken error: {str(e)}")
            resp = Response(
                {
                    "error": "Refresh token is invalid or blacklisted. Please log in again."
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )
            resp.delete_cookie("refresh_token")
            return resp
        except TokenError as e:
            # Handle general token-related errors
            print(f"TokenError: {str(e)}")
            return Response(
                {"error": "Token error occurred. Please try again."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Default response for unexpected cases
        return Response(
            {"error": "An unexpected error occurred."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


class RegisterUserView(APIView):
    permission_classes = [AllowAny]
    template_name = "register.html"

    def get(self, request):
        # Redirect to home page if already logged in
        if request.COOKIES.get("access_token"):
            return redirect("/")
        return render(request, self.template_name)

    def post(self, request):
        serializer = RegisterUser(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(
                {"message": "Successfully registrered user."}, status=status.HTTP_200_OK
            )
        return Response(
            {"error": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
        )


class LoginView(APIView):
    permission_classes = [AllowAny]
    template_name = "login.html"

    def get(self, request):
        # Redirect to home page if already logged in
        if request.COOKIES.get("access_token"):
            return redirect("/")
        # Render the login page template on GET request
        return render(request, self.template_name)

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data["user"]
            refresh = RefreshToken.for_user(user)
            eg_user = {
                "username": user.username,
                "profile": (
                    user.profile.profile_image.url
                    if user.profile.profile_image
                    else None
                ),
                "user_email": user.email,
                "user_name": " ".join([user.first_name, user.last_name]),
            }
            response = Response(
                {"user": encodeBase64Json(eg_user)}, status=status.HTTP_200_OK
            )
            response.set_cookie(
                key="access_token",
                value=str(refresh.access_token),
                samesite="Lax",  # CSRF protection for cookie
                expires=(
                    datetime.now(timezone.utc)
                    + settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"]
                ),  # Set to JWT expiry
            )
            response.set_cookie(
                key="refresh_token",
                value=str(refresh),
                httponly=True,  # Secure the cookie
                secure=SECURE_TOKEN_MODE,  # Use HTTPS in production
                samesite="Lax",  # CSRF protection for cookie
                expires=(
                    datetime.now(timezone.utc)
                    + settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"]
                ),  # Set to JWT expiry
            )
            return response
        return Response(
            {"error": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
        )


class HomePageView(APIView):
    permission_classes = [AllowAny]
    renderer_classes = [TemplateHTMLRenderer]
    template_name = "home.html"

    def get(self, request):
        # Render the login page template on GET request
        return render(request, self.template_name)


class ProfilePageView(APIView):
    authentication_classes = [RedirectJWTAuthentication]
    permission_classes = [AllowAny]
    template_name = "profile.html"

    def get(self, request):
        # Redirect if the user is not authenticated
        if not request.user or request.user.is_anonymous:
            return redirect("/login")
        # Render the login page template on GET request
        return render(request, self.template_name)


class ProfileAPIView(RetrieveUpdateAPIView):
    serializer_class = ProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        try:
            return Profile.objects.get(user=self.request.user)
        except Profile.DoesNotExist:
            raise NotFound({"error": "Profile not found."})

    def perform_update(self, serializer):
        # Get the current profile instance
        instance = self.get_object()
        # Prevent to store empty phone number if already save
        if instance.mobile_number and self.request.data.get('mobile_number') is None:
            raise serializers.ValidationError("Enter a valid phone number to update")

        # Check if a new profile image is being uploaded
        new_image = self.request.FILES.get("profile_image")
        if new_image and instance.profile_image:
            # Delete the old profile image from storage
            if os.path.isfile(instance.profile_image.path):
                os.remove(instance.profile_image.path)

        # Save the updated profile
        serializer.save()


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # Get the refresh token from the cookie
        refresh_token = request.COOKIES.get("refresh_token")
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()  # Blacklist the token
            except Exception as e:
                return Response(
                    {"error": "Invalid token"}, status=status.HTTP_400_BAD_REQUEST
                )

        response = Response({"message": "Successfully logged out"}, status=200)
        # Clear the refresh_token token cookie by setting it to expire immediately
        if refresh_token:
            response.delete_cookie("refresh_token")
        return response


class AboutPageView(APIView):
    permission_classes = [AllowAny]
    renderer_classes = [TemplateHTMLRenderer]
    template_name = "about.html"

    def get(self, request):
        return render(request, self.template_name)

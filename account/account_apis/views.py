from django.shortcuts import render, redirect
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from account.account_apis.serializers import (
    RegisterUser,
    LoginSerializer,
    ProfileSerializer,
    EnquirySerializer,
)
from account.models import Profile, Enquiry
from rest_framework.views import APIView
from rest_framework.generics import RetrieveUpdateAPIView, CreateAPIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.renderers import TemplateHTMLRenderer
from rest_framework.exceptions import NotFound
from django.conf import settings
from datetime import datetime, timezone
from ridexleather.common import encodeBase64Json, RedirectJWTAuthentication, send_custom_email
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle
from rest_framework import serializers
from django.core.cache import cache
from rest_framework.exceptions import Throttled
import os, pyotp

User = get_user_model()
SECURE_TOKEN_MODE = False


class VerifyOTPView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        email = request.data.get('email')
        otp_entered = request.data.get('otp')
        password = request.data.get('password')
        try:
            user = User.objects.get(email=email)

            if not user.otp_secret:
                return Response({"error": "OTP not generated"}, status=status.HTTP_400_BAD_REQUEST)
            totp = pyotp.TOTP(user.otp_secret, interval=900)        # OTP valid only for 15 minutes

            if totp.verify(otp_entered):
                if password:
                    user.is_verified = True  # Activate user
                    user.save()
                    # Call the existing LoginView.post method
                    request.data['user_cred'] = email
                    request.data['password'] = password
                    return LoginView().post(request)
                else:
                    # OTP verified, store email in session for password reset
                    cache.set(f"verified_{email}", True, timeout=600)
                    return Response({"message": "OTP verified successfully."}, status=status.HTTP_200_OK)
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
            return redirect("/home")
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
            return redirect("/home")
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
                "is_admin": user.is_staff
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
    

class LandingPageView(APIView):
    permission_classes = [AllowAny]
    renderer_classes = [TemplateHTMLRenderer]
    template_name = "landing_page.html"

    def get(self, request):
        return render(request, self.template_name)

 
class ForgetPasswordPageView(APIView):
    permission_classes = [AllowAny]
    renderer_classes = [TemplateHTMLRenderer]
    template_name = "forget_password.html"

    def get(self, request):
        return render(request, self.template_name)


class RefundPolicyPageView(APIView):
    permission_classes = [AllowAny]
    renderer_classes = [TemplateHTMLRenderer]
    template_name = "refund_policy.html"

    def get(self, request):
        return render(request, self.template_name)


class ShippingPolicyPageView(APIView):
    permission_classes = [AllowAny]
    renderer_classes = [TemplateHTMLRenderer]
    template_name = "shipping_policy.html"

    def get(self, request):
        return render(request, self.template_name)
    
    
class TermsAndConditionPageView(APIView):
    permission_classes = [AllowAny]
    renderer_classes = [TemplateHTMLRenderer]
    template_name = "terms_and_condition.html"

    def get(self, request):
        return render(request, self.template_name)
    
    
class PrivacyPolicyPageView(APIView):
    permission_classes = [AllowAny]
    renderer_classes = [TemplateHTMLRenderer]
    template_name = "privacy_policy.html"

    def get(self, request):
        return render(request, self.template_name)
    
    
class SendOTPView(APIView):
    """
    Sends an OTP to the user's email for password reset.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email", "")
        register_user = request.data.get("register_user", "")
        user = User.objects.filter(email=email).first()
        if not user:
            return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)
        
        secret = user.generate_otp_secret()
        otp = pyotp.TOTP(secret, interval=900).now()
        subject = f"Ridexleather {"Signup" if register_user else "Reset Password"} OTP verification"
        email_content = "Thank you for signing up with <strong>Ridexleather</strong>. Please enter the OTP below to verify your email" if register_user else "Thank you for being a part of <strong>Ridexleather</strong>. Use the one-time password (OTP) below to reset your password"
        html_mail_content = f'''
            <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; text-align: center; padding: 20px;">
                <div style="max-width: 500px; margin: auto; background: linear-gradient(145deg, #ffffff, #f9f9f9); padding: 25px; border-radius: 10px; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);">
                    <p style="color: #555; font-size: 15px; line-height: 1.6; margin-bottom: 15px;">
                        Hi <strong>{user.first_name}</strong>, 
                    </p>
                    <p style="color: #666; font-size: 14px; line-height: 1.6; margin-bottom: 15px;">
                        {email_content}:
                    </p>
                    <div style="display: inline-block; padding: 15px 30px; font-size: 20px; font-weight: 600; letter-spacing: 3px; color: #333; background-color: #f8f9fa; border: 1px dashed #007bff; border-radius: 5px; margin-bottom: 20px;">
                        {otp}
                    </div>
                    <p style="color: #777; font-size: 14px; margin-bottom: 20px;">
                        This OTP is valid for <strong>15 minutes</strong>. Please do not share this code with anyone for security reasons.
                    </p>
                    <p style="color: #888; font-size: 14px; margin-bottom: 20px;">
                        If you did not request a password reset, you can safely ignore this email.
                    </p>
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="font-size: 14px; color: #555; line-height: 1.6; margin-bottom: 15px;">
                        Need help? Contact us at <a href="mailto:ridexleatherhelpdesk@gmail.com" style="color: #007bff; text-decoration: none;">
                            ridexleatherhelpdesk@gmail.com</a> or visit our 
                        <a href="#" style="color: #007bff; text-decoration: none;">Help Center</a>.
                    </p>
                    <p style="font-size: 14px; color: #555; line-height: 1.6;">
                        <strong>Ridexleather</strong> | 
                        <a href="https://www.ridexleathers.com" style="color: #007bff; text-decoration: none;">
                            ridexleathers.com
                        </a>
                    </p>
                </div>
            </div>

        '''
        send_custom_email(subject, [email], html_mail_content)
        return Response({"message": "OTP sent successfully."}, status=status.HTTP_200_OK)


class ResetPasswordView(APIView):
    """
    Resets the user's password after OTP verification.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email")
        new_password = request.data.get("password", "").strip()
        if len(new_password) < 6:
            return Response({"error": "Password must be at least 6 characters long."}, status=status.HTTP_400_BAD_REQUEST)
        
        if not cache.get(f"verified_{email}"):
            return Response({"error": "OTP verification required."}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.filter(email=email).first()
        if not user:
            return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        user.set_password(new_password)
        user.save()

        # Clear session after password reset
        cache.delete(f"verified_{email}")

        return Response({"message": "Password reset successfully."}, status=status.HTTP_200_OK)


class EnquiryThrottle(AnonRateThrottle):
    # Limit 5 enquiries per hour for anonymous users
    rate = '5/hour' 

class UserEnquiryThrottle(UserRateThrottle):
    # Logged-in users can send 10 enquiries per hour
    rate = '10/hour'

class EnquiryCreateView(CreateAPIView):
    queryset = Enquiry.objects.all()
    serializer_class = EnquirySerializer
    permission_classes = [AllowAny]
    throttle_classes = [EnquiryThrottle, UserEnquiryThrottle]

    def perform_create(self, serializer):
        if self.request.user.is_authenticated:
            serializer.save(user=self.request.user)
        else:
            serializer.save()
            
    def handle_exception(self, exc):
        """Customize the throttling message"""
        if isinstance(exc, Throttled):
            wait_time = int(exc.wait) if exc.wait else 0  # Get remaining wait time
            return Response(
                {"detail": f"We have received you previous messages! Please wait for response or try again in {wait_time//60} minutes."},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )
        return super().handle_exception(exc)
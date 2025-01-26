from django.db import models
from django.contrib.auth.models import AbstractUser
from phonenumber_field.modelfields import PhoneNumberField
from .managers import CustomUserManager
import pyotp


class User(AbstractUser):
    email = models.EmailField(max_length=100, unique=True)
    username = models.CharField(max_length=10, unique=True, blank=True, null=True)
    last_name = models.CharField(max_length=150, default="", blank=True)
    is_verified = models.BooleanField(default=False)  # OTP verification status
    otp_secret = models.CharField(max_length=50, blank=True, null=True)  # Store secret key

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = CustomUserManager()
    
    def generate_otp_secret(self):
        """Generate and store OTP secret key"""
        secret = pyotp.random_base32()
        self.otp_secret = secret
        self.save()
        return secret

    def get_otp(self):
        """Generate TOTP using stored secret"""
        if self.otp_secret:
            totp = pyotp.TOTP(self.otp_secret, interval=900)        # OTP valid only for 15 minutes
            return totp.now()
        return None

    def __str__(self):
        return self.get_full_name()


class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    profile_image = models.ImageField(
        upload_to="images/profile_images/", null=True, blank=True
    )
    birth_date = models.DateField(null=True, blank=True)
    mobile_number = PhoneNumberField(unique=True, blank=True, null=True)
    street_address_1 = models.CharField(max_length=255, blank=True, null=True)
    street_address_2 = models.CharField(max_length=255, blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    state = models.CharField(max_length=100, blank=True, null=True)
    postal_code = models.CharField(max_length=20, blank=True, null=True)
    country_name = models.CharField(max_length=100, blank=True, null=True)

    def __str__(self):
        return self.user.email

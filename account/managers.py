from django.contrib.auth.base_user import BaseUserManager
from django.utils.translation import gettext_lazy as _
import random


class CustomUserManager(BaseUserManager):
    """
    Custom user model manager where email is the unique identifiers
    for authentication instead of usernames.
    """

    def create_user(self, email, password, **extra_fields):
        """
        Create and save a user with the given email and password.
        """
        if not email:
            raise ValueError(_("Email is required to register user."))
        
        email = self.normalize_email(email)
        user = self.model.objects.filter(email=email).first()
        # Allow user to register with otp if already registered but not verified
        if user:
            if user.is_verified:
                raise ValueError(_("User already registered and verified."))
            else:
                # Update password for unverified user
                user.set_password(password)
                user.save(using=self._db)
                return user
        if not extra_fields.get("username"):
            extra_fields.setdefault(
                "username", email.split("@")[0][:7] + str(random.randint(100, 999))
            )
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self.db)
        return user

    def create_superuser(self, email, password, **extra_fields):
        """
        Create and save a SuperUser with the given email and password.
        """
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError(_("Superuser must have is_staff=True."))
        if extra_fields.get("is_superuser") is not True:
            raise ValueError(_("Superuser must have is_superuser=True."))
        return self.create_user(email, password, **extra_fields)

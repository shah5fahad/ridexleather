from account.models import User, Profile
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework import serializers
from ridexleather.common import send_custom_email
import pyotp


class UserSerialzer(serializers.ModelSerializer):
    class meta:
        model = User
        fields = ["id", "username", "email"]


class ProfileSerializer(serializers.ModelSerializer):
    # Add User fields directly
    first_name = serializers.CharField(source="user.first_name", required=False)
    last_name = serializers.CharField(source="user.last_name", required=False)
    email = serializers.CharField(source="user.email", required=False)
    username = serializers.CharField(source="user.username", required=False)

    class Meta:
        model = Profile
        fields = [
            "first_name",
            "last_name",
            "email",
            "username",
            "profile_image",
            "birth_date",
            "mobile_number",
            "street_address_1",
            "street_address_2",
            "city",
            "state",
            "postal_code",
            "country_name",
        ]

    def update(self, instance, validated_data):
        # Extract user-related fields
        user_data = validated_data.pop("user", {})
        user = instance.user

        # Update User fields
        user.first_name = user_data.get("first_name", user.first_name)
        user.last_name = user_data.get("last_name", user.last_name)
        user.save()

        # Update Profile fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        return instance


class TokenObtainSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Add custom user data with token
        token["username"] = user.username
        token["email"] = user.email
        token["first_name"] = user.first_name
        token["last_name"] = user.last_name
        token["profile_image"] = str(user.profile.profile_image)
        token["country_name"] = user.profile.country_name

        return token


class RegisterUser(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True)
    password1 = serializers.CharField(write_only=True, required=True)
    email = serializers.EmailField(max_length=300, required=False)

    class Meta:
        model = User
        fields = ["first_name", "last_name", "email", "password", "password1"]

    def validate(self, data):
        if data["password"] != data["password1"]:
            raise serializers.ValidationError("Password mismatch.")
        return data

    def validate_password(self, password):
        if len(password) < 6:
            raise serializers.ValidationError(
                "Password must be at least 6 characters long."
            )
        if not any(char.isdigit() for char in password):
            raise serializers.ValidationError(
                "Password must contain at least one digit."
            )
        if not any(char.isalpha() for char in password):
            raise serializers.ValidationError(
                "Password must contain at least one letter."
            )
        return password

    def create(self, validated_data):
        user = User.objects.create_user(
            validated_data["email"],
            validated_data["password"],
            first_name=validated_data["first_name"],
            last_name=validated_data["last_name"],
        )
        secret = user.generate_otp_secret()
        otp = pyotp.TOTP(secret, interval=900).now()
        subject = "Ridexleather Signup OTP verification"
        html_mail_content = f'''
            <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; text-align: center; padding: 20px;">
                <div style="max-width: 500px; margin: auto; background: #ffffff; padding: 20px; border-radius: 8px; 
                            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);">
                    <p style="color: #555;font-size: 14px;">Dear <strong>{validated_data["first_name"]}</strong>,</p>
                    <p style="color: #555;font-size: 13px;">Thank you for signing up with <strong>Ridexleather</strong>. 
                    Please enter the OTP below to verify your email:</p>
                    
                    <div style="display: inline-block; font-size: 22px; font-weight: 600;padding: 10px 20px;">
                        {otp}
                    </div>

                    <p style="color: #888; font-size: 14px;">(This OTP is valid for <strong>15 minutes</strong>. Do not share it with anyone.)</p>
                    <p style="color: #888; font-size: 14px;">If you did not request this, please ignore this email.</p>

                    <div style="margin-top: 15px; font-size: 14px; color: #555;">
                        <p>Need help? Contact us at <a href="mailto:ridexleatherhelpdesk@gmail.com" style="color: #007bff; text-decoration: none;">ridexleatherhelpdesk@gmail.com</a> 
                        or visit our <a href="#" style="color: #007bff; text-decoration: none;">Help Center</a>.</p>
                        <p style="display: inline-block;"><strong>Ridexleather</strong></p> &#124; 
                        <p style="display: inline-block;"><a href="ridexleathers.com" style="color: #007bff; text-decoration: none;">ridexleathers.com</a></p>
                    </div>
                </div>
            </div>
        '''
        send_custom_email(subject, [validated_data["email"]], html_mail_content)
        return user


class LoginSerializer(serializers.ModelSerializer):
    user_cred = serializers.CharField(write_only=True, required=False)
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ("user_cred", "password")

    def validate(self, data):
        user_cred = data.get("user_cred", None)
        password = data.get("password")

        if not user_cred:
            raise serializers.ValidationError("Either username or email is required.")

        user = (
            User.objects.filter(username=user_cred, is_verified=True).first()
            or User.objects.filter(email=user_cred, is_verified=True).first()
        )

        if not user:
            raise serializers.ValidationError("User doesn't exists.")

        if not user.check_password(password):
            raise serializers.ValidationError("Invalid credentials.")

        data["user"] = user
        return data

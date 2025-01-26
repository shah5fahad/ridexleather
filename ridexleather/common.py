import base64, json
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import AuthenticationFailed
from rest_framework.pagination import PageNumberPagination
from django.core.mail import EmailMultiAlternatives
from django.utils.html import strip_tags

def send_custom_email(subject, user_emails, html_content):
    from_email = "ridexleatherhelpdesk@gmail.com"
    to_email = user_emails
    text_content = strip_tags(html_content)
    # Create email with both plain text and HTML
    email = EmailMultiAlternatives(subject, text_content, from_email, to_email)
    email.attach_alternative(html_content, "text/html")  # Attach HTML version
    email.send()


def encodeBase64Json(data):
    data = json.dumps(data)
    encoded_bytes = base64.b64encode(data.encode("utf-8"))
    encoded_str = encoded_bytes.decode("utf-8")
    return encoded_str


class RedirectJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        # Check for JWT in cookies
        access_token = request.COOKIES.get("access_token")

        if not access_token:
            # Redirect to login if token is not present
            return None

        # Validate the token using the parent class's method
        try:
            validated_token = self.get_validated_token(access_token)
        except AuthenticationFailed:
            # Token is invalid or expired; return None
            return None

        # Return the authenticated user
        user = self.get_user(validated_token)
        return (user, validated_token)


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 12
    page_size_query_param = 'page_size'
    max_page_size = 2

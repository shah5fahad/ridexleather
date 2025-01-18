from django.utils.deprecation import MiddlewareMixin
from django.shortcuts import redirect

class StripTrailingSlashMiddleware(MiddlewareMixin):
    def process_request(self, request):
        if request.path.endswith("/") and request.path != "/":
            return redirect(request.path.rstrip("/"), permanent=True)
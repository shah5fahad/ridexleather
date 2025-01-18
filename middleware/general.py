from django.utils.deprecation import MiddlewareMixin
from django.shortcuts import redirect

class StripTrailingSlashMiddleware(MiddlewareMixin):
    IGNORED_PATHS = ["/admin/"]  # Add paths you want to ignore

    def process_request(self, request):
        if request.path.endswith("/") and request.path != "/":
            # Check if the request path starts with any ignored path
            if any(request.path.startswith(ignored) for ignored in self.IGNORED_PATHS):
                return  # Ignore the URL, proceed with the request
            
            return redirect(request.path.rstrip("/"), permanent=True)

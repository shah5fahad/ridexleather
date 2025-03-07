import json
import urllib.request
from datetime import date
from django.core.cache import cache
from django.shortcuts import redirect
from account.models import WebsiteGeneralConfiguration
from django.utils.deprecation import MiddlewareMixin
from ridexleather.settings import CURRENCY_CONVERTER_API_URL, CURRENCY_CONVERTER_API_KEY

class StripTrailingSlashMiddleware(MiddlewareMixin):
    IGNORED_PATHS = ["/admin/"]  # Add paths you want to ignore

    def process_request(self, request):
        if request.path.endswith("/") and request.path != "/":
            # Check if the request path starts with any ignored path
            if any(request.path.startswith(ignored) for ignored in self.IGNORED_PATHS):
                return  # Ignore the URL, proceed with the request
            
            return redirect(request.path.rstrip("/"), permanent=True)
   
class UpdateCurrencyValueMiddleware(MiddlewareMixin):
    def process_request(self, request):
        CURRENCY = ['INR']
        if request.path.startswith("/items"):
            try:
                inr_currency = WebsiteGeneralConfiguration.objects.filter(meta_key=CURRENCY[0]).first()
                if not inr_currency or inr_currency.date_modified != date.today():
                    url = f"{CURRENCY_CONVERTER_API_URL}?apikey={CURRENCY_CONVERTER_API_KEY}&base_currency=USD"
                    with urllib.request.urlopen(url) as resp:
                        data = json.loads(resp.read().decode())
                    if "data" in data:
                        one_usd_to_inr = data['data'].get("INR", {}).get("value", None)
                        if one_usd_to_inr:
                            one_usd_to_inr = str(round(one_usd_to_inr, 2))
                            cache.set(f"currency_rate_{CURRENCY[0]}", one_usd_to_inr, timeout=24 * 3600)
                            if inr_currency:
                                inr_currency.meta_value = one_usd_to_inr
                                inr_currency.save()
                            else:
                                WebsiteGeneralConfiguration.objects.create(
                                    meta_key=CURRENCY[0],
                                    meta_value=one_usd_to_inr
                                )
            except Exception as e:
                print("Currency update exception Error \n", e)  

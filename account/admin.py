from django.contrib import admin
from .models import User, Profile, Enquiry, WebsiteGeneralConfiguration


class UserAdmin(admin.ModelAdmin):
    list_display = ["username", "email"]


class ProfileAdmin(admin.ModelAdmin):
    list_display = ["user", "country_name"]
    
    
class EnquiryAdmin(admin.ModelAdmin):
    list_display = ["name", "email"]
    

class WebsiteGeneralConfigurationAdmin(admin.ModelAdmin):
    list_display = ["meta_key", "date_modified"]


admin.site.register(User, UserAdmin)
admin.site.register(Profile, ProfileAdmin)
admin.site.register(Enquiry, EnquiryAdmin)
admin.site.register(WebsiteGeneralConfiguration, WebsiteGeneralConfigurationAdmin)

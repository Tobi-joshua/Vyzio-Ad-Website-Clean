from django.contrib import admin
from django.urls import path
from django.template.response import TemplateResponse
from django.db.models import Count
from django.utils.html import format_html
from .models import *

class AdImageInline(admin.TabularInline):
    model = AdImage
    extra = 1
    fields = ('image',)
    can_delete = True


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('username', 'email', 'is_advertiser', 'phone', 'country')
    search_fields = ('username', 'email', 'phone', 'country')


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'icon', 'description')


@admin.register(Ad)
class AdAdmin(admin.ModelAdmin):
    list_display = ('title', 'user', 'category', 'city', 'price', 'is_active', 'created_at')
    list_filter = ('category', 'city', 'is_active')
    search_fields = ('title', 'description', 'city', 'user__username')
    inlines = [AdImageInline]


@admin.register(AdImage)
class AdImageAdmin(admin.ModelAdmin):
    list_display = ('ad', 'image')


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('user', 'ad', 'amount', 'method', 'status', 'created_at')
    list_filter = ('method', 'status')
    search_fields = ('user__username', 'ad__title')


@admin.register(Chat)
class ChatAdmin(admin.ModelAdmin):
    list_display = ('id', 'ad', 'buyer', 'seller', 'created_at', 'updated_at')
    list_filter = ('created_at', 'updated_at')
    search_fields = ('ad__title', 'buyer__username', 'seller__username')
    ordering = ('-created_at',)


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ('id', 'chat', 'sender', 'text_preview', 'is_read', 'created_at')
    list_filter = ('is_read', 'created_at')
    search_fields = ('chat__ad__title', 'sender__username', 'text')
    ordering = ('-created_at',)

    def text_preview(self, obj):
        return (obj.text[:50] + "...") if obj.text else "(Attachment only)"
    text_preview.short_description = "Message Preview"


@admin.register(SavedAd)
class SavedAdAdmin(admin.ModelAdmin):
    list_display = ('user', 'ad', 'saved_at')
    list_filter = ('saved_at',)
    search_fields = ('user__username', 'ad__title')


@admin.register(ViewHistory)
class ViewHistoryAdmin(admin.ModelAdmin):
    list_display = ('user', 'ad', 'viewed_at')
    list_filter = ('viewed_at',)
    search_fields = ('user__username', 'ad__title')


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'ad', 'total', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('user__username', 'ad__title')
    ordering = ('-created_at',)


@admin.register(BuyerNotification)
class BuyerNotificationAdmin(admin.ModelAdmin):
    list_display = ('buyer', 'notification_type', 'header', 'is_read', 'timestamp')
    list_filter = ('notification_type', 'is_read', 'timestamp')
    search_fields = ('buyer__username', 'header', 'message')


@admin.register(SellerNotification)
class SellerNotificationAdmin(admin.ModelAdmin):
    list_display = ('seller', 'notification_type', 'header', 'is_read', 'timestamp')
    list_filter = ('notification_type', 'is_read', 'timestamp')
    search_fields = ('seller__username', 'header', 'message')


@admin.register(Application)
class ApplicationAdmin(admin.ModelAdmin):
    list_display = ('ad', 'applicant', 'status', 'applied_at', 'updated_at')
    list_filter = ('status', 'applied_at', 'updated_at')
    search_fields = ('applicant__username', 'ad__title', 'phone_number', 'portfolio_url', 'linkedin_url')
    readonly_fields = ('applied_at', 'updated_at')
    ordering = ('-applied_at',)

    fieldsets = (
        (None, {
            'fields': ('ad', 'applicant', 'status')
        }),
        ('Application Details', {
            'fields': ('cover_letter', 'resume', 'resume_url', 'phone_number', 'portfolio_url', 'linkedin_url', 
                       'expected_salary', 'available_start_date', 'is_willing_to_relocate', 'notes')
        }),
        ('Timestamps', {
            'fields': ('applied_at', 'updated_at')
        }),
    )



@admin.register(ListingPrice)
class ListingPriceAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "currency", "amount", "is_default", "active", "created_at")
    list_filter = ("currency", "active", "is_default")
    search_fields = ("currency", "name")
    ordering = ("-created_at",)
    actions = ("make_default_for_currency", "activate_prices", "deactivate_prices")

    def make_default_for_currency(self, request, queryset):
        """
        Mark selected ListingPrice as default for their currencies.
        If multiple selected across different currencies, handle each.
        """
        for lp in queryset:
            # unset other defaults for same currency
            ListingPrice.objects.filter(currency__iexact=lp.currency).exclude(pk=lp.pk).update(is_default=False)
            lp.is_default = True
            lp.active = True
            lp.save(update_fields=["is_default", "active"])
        self.message_user(request, _("Selected listing price(s) marked as default for their currency."))
    make_default_for_currency.short_description = "Make selected price(s) default for their currency"

    def activate_prices(self, request, queryset):
        updated = queryset.update(active=True)
        self.message_user(request, _("%d listing price(s) activated.") % updated)
    activate_prices.short_description = "Activate selected listing price(s)"

    def deactivate_prices(self, request, queryset):
        updated = queryset.update(active=False)
        self.message_user(request, _("%d listing price(s) deactivated.") % updated)
    deactivate_prices.short_description = "Deactivate selected listing price(s)"



# ================== CUSTOM ADMIN DASHBOARD WITH CHARTS ==================
class CustomAdminSite(admin.AdminSite):
    site_header = "Vyzio Ad Admin"
    site_title = "Vyzio Ad Admin Portal"
    index_title = "Welcome to the Vyzio Ad Administration Portal"

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path('analytics/', self.admin_view(self.analytics_view), name='analytics'),
        ]
        return custom_urls + urls

    def analytics_view(self, request):
        ads_per_category = (
            Category.objects.annotate(total_ads=Count('ad'))
            .values_list('name', 'total_ads')
        )

        labels = [cat[0] for cat in ads_per_category]
        data = [cat[1] for cat in ads_per_category]

        context = {
            'labels': labels,
            'data': data,
            'title': 'Ads Per Category',
        }
        return TemplateResponse(request, "admin/analytics.html", context)


custom_admin_site = CustomAdminSite(name='custom_admin')

# Keep default admin site style
admin.site.site_header = "Vyzio Ad Admin"
admin.site.site_title = "Vyzio Ad Admin Portal"
admin.site.index_title = "Welcome to the Vyzio Ad Administration Portal"

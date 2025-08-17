from django.urls import path, include
from django.contrib.auth.views import *
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView, TokenVerifyView
from ads import views

urlpatterns = [
     path('users/create/', views.create_users, name='create_user'),
     path('homepage/', views.homepage_data, name='homepage-data'),
     path('ads/', views.ads_list, name='ads-list'),
     path('ads/<int:id>/', views.ad_detail, name='ad-detail'),
     path('categories/', views.category_list, name='category-list'),        
     path('categories/create/', views.category_create, name='category-create'), 
     path('categories/<int:pk>/ads/', views.category_ads_list, name='category-ads-list'),
     path('ads/create/', views.create_ads, name='ad-create'),
     path('auth/user-data/', views.user_data_view, name='api_get_user_data'),
     path('auth/signup/seller/', views.seller_signup, name='api_auth_signup_seller'),
     path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
     path('token/verify/', TokenVerifyView.as_view(), name='token_verify'),
     path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
     path('user/login/', views.login_user, name='login_user'),
     # Google OAuth - Buyer
    path('google/buyer/login/', views.google_login_buyer, name='google_login_buyer'),
    path('google/buyer/signup/', views.google_signup_buyer, name='google_signup_buyer'),

    # Google OAuth - Seller
    path('google/seller/login/', views.google_login_seller, name='google_login_seller'),
    path('google/seller/signup/', views.google_signup_seller, name='google_signup_seller'),

    # Password Reset
    path('auth/password/reset/<str:uidb64>/<str:token>/', views.reset_password, name='password_reset_confirm'),

    # Token revoke (logout)
    path('user/logout/', views.RevokeTokenView, name='user_logout'),

    # Standard signups
    path('auth/signup/buyer/', views.buyer_signup, name='api_auth_signup_buyer'),
    path('auth/signup/seller/', views.seller_signup, name='api_auth_signup_seller'),

    # Profile creation / updates
    path('auth/profile/buyer/', views.create_buyer_profile, name='api_auth_profile_update_buyer'),
    path('auth/profile/seller/', views.create_seller_profile, name='api_auth_profile_update_seller'),

    # Profile fetch
    path('auth/get/buyer/', views.get_buyer_profile, name='api_get_profile_buyer'),
    path('auth/get/seller/', views.get_seller_profile, name='api_get_profile_seller'),

    # Change password
    path('auth/change-password/', views.UpdatePasswordView, name='update_password'),

    # Get user data
    path('user/data/', views.user_data_view, name='user_data'),
    path('check-username-email/', views.check_username_email, name='check_username_email'),

    path('buyer-dashboard/', views.buyer_dashboard, name='buyer-dashboard'),
    path('buyer/<int:buyer_id>/chats/', views.buyer_chats, name='buyer_chats'),
    path('chats/create/', views.create_chat, name='create_chat'),
    path('messages/send/', views.send_message, name='send_message'),
    path('chats/<int:chat_id>/messages/', views.get_messages, name='get_messages'),
    path('chats/<int:chat_id>/mark-read/', views.mark_chat_read, name='mark_as_read'),
    path('buyer/<int:buyer_id>/orders/', views.buyer_orders, name='buyer_orders'),
    path('buyer/<int:buyer_id>/notifications/', views.buyer_notifications_list),
    path('buyer/notifications/<int:notif_id>/mark-read/', views.mark_buyer_notification_read),
    path('ads/<int:ad_id>/view/', views.record_ad_view, name='record_ad_view'),
    path('ads/<int:ad_id>/views/', views.ad_view_history, name='ad_view_history'),
    path('ads/<int:ad_id>/save/', views.save_unsave_ad, name='save_unsave_ad'),
    path('buyer/<int:buyer_id>/saved-ads/', views.buyer_saved_ads, name='buyer_saved_ads'),
    path('applications/', views.application_create, name='application-create'),
    path('buyer-applications-list/', views.buyer_applications_list, name='buyer_applications_list'),
    path('buyer/<int:buyer_id>/view-history/', views.buyer_view_history, name='buyer-view-history'),
    path('buyer/account-settings/', views.buyer_account_settings, name='buyer-account-settings'),
    path('sellers-dashboard/', views.seller_dashboard, name='seller-dashboard'),
    path('seller/ads/list/', views.seller_ads_list, name='seller-ads-list'),
    path('seller/ads/create/', views.ads_create, name='seller-ads-create'),
    path("seller/ads/<int:pk>/", views.seller_ad_detail, name="seller-ad-detail"),
    path("seller/ads/<int:pk>/create-payment/", views.create_ad_payment, name="create-ad-payment"),
    path("seller/payments/confirm/stripe/", views.confirm_stripe_payment, name='confirm-stripe-payment'),
    path("seller/payments/confirm/crypto/", views.confirm_crypto_payment, name='confirm-crypto-payment'),
    path("seller/ads/create-metadata/", views.ads_create_metadata, name="ads_create_metadata"),
    path("seller/ads/<int:pk>/upload-images/", views.ads_upload_images, name="ads_upload_images"),
    path("seller/delete/ads/<int:ad_id>/", views.delete_seller_ad, name="delete_seller_ad"),
    path("seller/edit/ads/<int:pk>/", views.ads_edit_detail, name="ads-detail"),
    path("seller/ads/<int:pk>/header/", views.ads_header_delete, name="ads-header-delete"),
    path("seller/ads/images/<int:pk>/", views.ads_image_delete, name="ads-image-delete"),
    path('seller/<int:seller_id>/chats/', views.seller_chats, name='seller_chats'),
    path('buyer/<int:buyer_id>/orders/', views.buyer_orders, name='buyer_orders'),
    path('seller/<int:seller_id>/orders/', views.seller_orders, name='seller_orders'),
    path("seller/orders/<int:order_id>/", views.seller_order_update, name="seller-order-update"),

]
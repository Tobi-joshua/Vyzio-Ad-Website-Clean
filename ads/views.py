"""
Standard Library imports
These are built-in Python modules for OS interaction, regex, math, randomness,
security, encoding, logging, date/time, decimal operations, and function utilities.
"""
import os
import re
import math
import random
import secrets
import string
import base64
import logging
from datetime import datetime, timedelta
from decimal import Decimal
from functools import wraps
import requests
from django.utils.timezone import now
from django.utils.html import strip_tags
import unicodedata
"""
Django Core imports
Django modules for authentication, messaging, HTTP responses, templates, ORM queries,
file handling, encoding utilities, decorators for views, and timezone support.
"""
from django.contrib import messages
from django.contrib.auth import (
    login, logout, authenticate, update_session_auth_hash, get_user_model
)
from django.contrib.auth.decorators import user_passes_test
from django.contrib.auth.tokens import default_token_generator
from django.contrib.auth.views import *
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.db import IntegrityError
from django.db.models import F, Sum, Q, Count, Avg
from django.http import HttpResponse, JsonResponse
from django.shortcuts import render, redirect, reverse, get_object_or_404
from django.template import loader
from django.utils.encoding import force_bytes, force_str, smart_str
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.html import strip_tags
from django.utils.safestring import mark_safe
from django.utils.timezone import now
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST, require_http_methods, require_GET

"""
Third-Party Packages
Django REST framework imports for building APIs, permissions, parsers, JWT token handling,
Swagger docs (drf_yasg), Google Cloud auth and tasks, and query helpers.
"""
from rest_framework import status
from rest_framework.decorators import (
    api_view, permission_classes, parser_classes
)
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.status import *
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken, AccessToken
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from google.oauth2 import id_token
from google.cloud import tasks_v2
from google.auth.transport import requests as google_requests
from django.db.models import Q

"""
Project Specific Imports
Imports from the local Django app: settings, models, serializers, async tasks,
Firebase Admin SDK for firestore and authentication, and DRF generics and permissions.
"""
from vyzio_backend import settings
from .models import *
from .serializers import *
from .tasks import *
from rest_framework import generics, permissions
import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore
from firebase_admin import auth as firebase_auth
os.environ["GOOGLE_CLOUD_PROJECT"] = "expert-hive-tutors"

logger = logging.getLogger(__name__)
GOOGLE_CLIENT_ID = "1094040105500-n1chuvrvp648phgra7qh2q6ctq4vr8s6.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET = "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"




db = firestore.client()
User = get_user_model()

"""
API Endpoint: Create Users
Handles creation of one or multiple users using UserSerializer.
Returns 201 on success, 400 on validation errors.
"""
@api_view(['POST'])
def create_users(request):
    if isinstance(request.data, list):
        serializer = UserSerializer(data=request.data, many=True)
    else:
        serializer = UserSerializer(data=request.data)

    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


"""
API Endpoint: Homepage Data
Returns featured ads, all categories, and some site statistics.
"""
@api_view(["GET"])
def homepage_data(request):
    featured_ads = Ad.objects.filter(is_active=True).order_by('-created_at')[:5]
    featured_ads_data = AdsSerializer(featured_ads, many=True).data

    categories = Category.objects.all()
    categories_data = CategorySerializer(categories, many=True).data

    stats = {
        "total_ads": Ad.objects.count(),
        "total_users": User.objects.count(),
        "active_ads": Ad.objects.filter(is_active=True).count(),
        "total_advertisers": User.objects.filter(is_advertiser=True).count(),
        "confirmed_payments": Payment.objects.filter(status='confirmed').count(),
        "total_revenue": Payment.objects.filter(status='confirmed').aggregate(total=models.Sum('amount'))['total'] or 0,
    }

    return Response({
        "message": "Welcome to Vyzio Ads!",
        "featured_ads": featured_ads_data,
        "categories": categories_data,
        "stats": stats,
    })

"""
API Endpoint: List Ads
Returns all active ads ordered by creation date descending.
"""
@api_view(['GET'])
def ads_list(request):
    ads = Ad.objects.filter(is_active=True).order_by('-created_at')
    serializer = AdsSerializer(ads, many=True)
    return Response(serializer.data)


"""
API Endpoint: Ad Detail
Returns details for a single active ad by ID.
"""
@api_view(['GET'])
def ad_detail(request, id):
    try:
        ad = Ad.objects.get(pk=id, is_active=True)
    except Ad.DoesNotExist:
        return Response({"detail": "Ad not found."}, status=status.HTTP_404_NOT_FOUND)

    serializer = AdsSerializer(ad)
    return Response(serializer.data)


"""
API Endpoint: Create Categories
Supports bulk creation or single creation of categories.
"""
@api_view(['POST'])
def category_create(request):
    is_many = isinstance(request.data, list)
    if is_many:
        serializer = BulkCategorySerializer(data=request.data, many=True)
    else:
        serializer = CategorySerializer(data=request.data)

    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    else:
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


"""
API Endpoint: List Categories
Returns all categories.
"""
@api_view(['GET'])
def category_list(request):
    categories = Category.objects.all()
    serializer = CategorySerializer(categories, many=True)
    return Response(serializer.data)


"""
API Endpoint: List Ads in Category
Returns ads belonging to a given category.
"""
@api_view(['GET'])
def category_ads_list(request, pk):
    try:
        ads = Ad.objects.filter(category_id=pk, is_active=True).order_by('-created_at')
    except Category.DoesNotExist:
        return Response({'detail': 'Category not found'}, status=status.HTTP_404_NOT_FOUND)

    serializer = AdsSerializer(ads, many=True)
    return Response(serializer.data)


"""
API Endpoint: Create Ads
Supports creation of multiple ads at once.
"""
@api_view(['POST'])
def create_ads(request):
    serializer = AdCreateSerializer(data=request.data, many=True)  
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


"""""""""""""""""""""""""""""""""""""""""
Seller and Buyer Sign Up Section
"""""""""""""""""""""""""""""""""""""""""

def get_user_type(user):
    """
    Returns the user type based on buyer/seller attributes.
    """
    if getattr(user, 'is_buyer', False):
        return "buyer"
    elif getattr(user, 'is_seller', False):
        return "seller"
    return "unknown"



@api_view(['POST', 'GET'])
def login_user(request):
    """
    Handles traditional username/password authentication.

    - **GET**: Returns a welcome message for authenticated users.
    - **POST**: Authenticates users with username/password and generates a Firebase token.
    """
    if request.method == 'GET':
        current_user = request.user
        return Response(status=HTTP_200_OK, data=f'You are welcome! {current_user}')

    elif request.method == 'POST':
        username = request.data.get('username')
        password = request.data.get('password')
        user = authenticate(username=username, password=password)

        if user:
            if not user.is_active:
                return Response({"error": "Account is not verified."}, status=HTTP_403_FORBIDDEN)

            refresh = RefreshToken.for_user(user)
            access = AccessToken.for_user(user)

            # Generate Firebase Authentication Token using user.id as Firebase UID
            firebase_token = firebase_auth.create_custom_token(str(user.id))

            return Response(data={
                'success': True,
                'userType': get_user_type(user),
                'refresh': str(refresh),
                'email': user.email,
                'access': str(access),
                'userID':user.id,
                'firebase_token': firebase_token.decode("utf-8")  
            }, status=HTTP_200_OK)

        return Response({"error": "Wrong Credentials"}, status=HTTP_400_BAD_REQUEST)





@api_view(['POST'])
def reset_password(request, uidb64, token):
    if request.method == 'POST':
        password1 = request.data.get('password1')
        password2 = request.data.get('password2')

        if not password1 or not password2:
            return Response({'error': 'Both password fields are required.'}, status=status.HTTP_400_BAD_REQUEST)

        if password1 != password2:
            return Response({'error': 'Passwords do not match.'}, status=status.HTTP_400_BAD_REQUEST)

        if len(password1) < 8:
            return Response({'error': 'Password must be at least 8 characters long.'}, status=status.HTTP_400_BAD_REQUEST)

        if not re.search(r"\d", password1):
            return Response({'error': 'Password must contain at least one digit.'}, status=status.HTTP_400_BAD_REQUEST)

        if not re.search(r"[A-Z]", password1):
            return Response({'error': 'Password must contain at least one uppercase letter.'}, status=status.HTTP_400_BAD_REQUEST)

        if not re.search(r"[a-z]", password1):
            return Response({'error': 'Password must contain at least one lowercase letter.'}, status=status.HTTP_400_BAD_REQUEST)

        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password1):
            return Response({'error': 'Password must contain at least one special character.'}, status=status.HTTP_400_BAD_REQUEST)

        if not token or not uidb64:
            return Response({'error': 'Token or UID is missing.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)

            if not default_token_generator.check_token(user, token):
                return Response({'error': 'Invalid or expired token.'}, status=status.HTTP_400_BAD_REQUEST)

            user.set_password(password1)
            user.save()

            # Return success response
            return HttpResponse(
                "<h1>Password Reset Successful</h1>"
                "<p>Your password has been successfully updated. You can now log in with your new password.</p>"
            )

        except User.DoesNotExist:
            return Response({'error': 'User does not exist.'}, status=status.HTTP_404_NOT_FOUND)

        except Exception as e:
            return Response({'error': f'Unexpected error: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)




@api_view(["POST"])
def google_signup_seller(request):
    """
    Handles Google OAuth 2.0 Sign-Up for sellers.
    """
    credential = request.data.get("credential")  
    phone = request.data.get("phone")
    country = request.data.get("country", "USA")

    if not credential:
        return Response({"error": "ID token missing"}, status=400)

    try:
        # Verify Google ID Token
        id_info = id_token.verify_oauth2_token(credential, google_requests.Request(), GOOGLE_CLIENT_ID)

        email = id_info.get("email")
        first_name = id_info.get("given_name", "")
        last_name = id_info.get("family_name", "")
        avatar = id_info.get("picture", "")

        if not email:
            return Response({"error": "No email found!"}, status=400)

        # Check if user exists
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                "username": email,
                "first_name": first_name,
                "last_name": last_name,
                "avatar_url": avatar,  
                "phone": phone,
                "country": country,
                "is_active": True,
                "is_seller": True,
                "is_verified": True,
            }
        )

        if not created:
            return Response({"error": "User already exists!"}, status=400)

        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)

        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "userType": "seller",
        }, status=201)

    except ValueError as e:
        return Response({"error": f"Invalid token: {str(e)}"}, status=400)

    except Exception as e:
        return Response({"error": f"Unexpected error: {str(e)}"}, status=500)



@api_view(['POST'])
def google_login_seller(request):
    id_token = request.data.get('credential')

    if not id_token:
        return Response({"error": "Token missing"}, status=400)

    try:
        decoded_token = firebase_auth.verify_id_token(id_token)
        email = decoded_token.get("email")

        if not email:
            return Response({"error": "No email found in token"}, status=400)

        user = User.objects.filter(email=email).first()

        if not user:
            return Response({"error": "User not found! Please sign up first."}, status=400)

        refresh = RefreshToken.for_user(user)

        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "userType": get_user_type(user),
            "userID": user.id,
            "email": user.email,
        })

    except Exception as e:
        return Response({"error": f"Invalid Firebase token: {str(e)}"}, status=400)


@api_view(["POST"])
def google_signup_buyer(request):
    """
    Handles Google OAuth 2.0 Sign-Up for buyers.
    """
    credential = request.data.get("credential")  # ID token from frontend
    phone = request.data.get("phone")
    country = request.data.get("country", "USA")

    if not credential:
        return Response({"error": "ID token missing"}, status=400)

    try:
        # Verify Google ID Token
        id_info = id_token.verify_oauth2_token(credential, google_requests.Request(), GOOGLE_CLIENT_ID)

        email = id_info.get("email")
        first_name = id_info.get("given_name", "")
        last_name = id_info.get("family_name", "")
        avatar = id_info.get("picture", "")

        if not email:
            return Response({"error": "No email found!"}, status=400)

        # Check if user exists or create
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                "username": email,
                "first_name": first_name,
                "last_name": last_name,
                "avatar_url": avatar,    
                "phone": phone,
                "country": country,
                "is_active": True,
                "is_buyer": True,
                "is_verified": True,    
            }
        )

        if not created:
            return Response({"error": "User already exists!"}, status=400)

        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)

        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "userType": "buyer",  # better label than 'student'
        }, status=201)

    except ValueError as e:
        return Response({"error": f"Invalid token: {str(e)}"}, status=400)

    except Exception as e:
        return Response({"error": f"Unexpected error: {str(e)}"}, status=500)



@api_view(['POST'])
def google_login_buyer(request):
    id_token = request.data.get('credential')

    if not id_token:
        return Response({"error": "Token missing"}, status=400)

    try:
        decoded_token = firebase_auth.verify_id_token(id_token)
        email = decoded_token.get("email")

        if not email:
            return Response({"error": "No email found in token"}, status=400)

        user = User.objects.filter(email=email).first()

        if not user:
            return Response({"error": "User not found! Please sign up first."}, status=400)

        refresh = RefreshToken.for_user(user)

        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "userType": get_user_type(user),
            "userID": user.id,
            "email": user.email,
        })

    except Exception as e:
        return Response({"error": f"Invalid Firebase token: {str(e)}"}, status=400)





@api_view(['POST'])
def RevokeTokenView(request):
    """
    Revoke (blacklist) a refresh token.
    """
    try:
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response({"success": False, "error": "Refresh token is required."}, status=status.HTTP_400_BAD_REQUEST)

        # Blacklist the refresh token
        token = RefreshToken(refresh_token)
        token.blacklist()

        return Response({"success": True, "message": "Token revoked successfully."}, status=status.HTTP_200_OK)
    except TokenError as e:
        return Response({"success": False, "error": "Invalid or already revoked token."}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({"success": False, "error": f"Server error: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def seller_signup(request):
    serializer = UserSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        user.is_active = True
        user.is_seller = True  
        user.is_verified = True
        user.is_advertiser = True
        user.save()
        return Response({"message": "User created successfully"}, status=status.HTTP_201_CREATED)
    else:
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)



@api_view(['POST'])
def create_seller_profile(request):
    user_id = request.data.get('user_id')

    if not user_id:
        return Response({"error": "user_id is required."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(pk=int(user_id))
    except User.DoesNotExist:
        return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

    if not user.is_active:
        return Response({"error": "User account is not active."}, status=status.HTTP_400_BAD_REQUEST)

    serializer = SellerProfileSerializer(user, data=request.data, partial=True, context={'request': request})

    if serializer.is_valid():
        updated_user = serializer.save()
        updated_user.email = user.email
        updated_user.is_seller = True
        updated_user.save()
        return Response({"message": "Seller profile successfully updated.", "user_id": user.id},
            status=status.HTTP_200_OK)
    return Response({"error": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)



@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_seller_profile(request):
    user = request.user
    try:
        if user.is_seller:
            serializer = SellerProfileSerializer(user)
            return Response(serializer.data, status=status.HTTP_200_OK)
        else:
            return Response({"profile_update": False, "userId": user.id}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            "userId": user.id,
            "success": False,
            "message": "An error occurred while fetching data.",
            "error": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



@api_view(['POST'])
@permission_classes([IsAuthenticated])
def UpdatePasswordView(request):
    serializer = PasswordUpdateSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        serializer.save()
        return Response({"message": "Password updated successfully."}, status=status.HTTP_200_OK)
    return Response({"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)



@api_view(['POST'])
def user_data_view(request):
    """
    API endpoint to fetch user data based on the user_id provided in the request body.
    """
    user_id = request.data.get('user_id')

    if not user_id:
        return Response(
            {"error": "User ID is required."},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        # Get the user object
        user = User.objects.get(id=user_id)

        # Default avatar URL
        default_avatar_url = "https://th.bing.com/th/id/OIP.IkLYdobJ8Ux8CAX0AfuXIQHaHa?rs=1&pid=ImgDetMain"

        # Build response data
        data = {
            "username": user.username,
            "userId": user.id,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email,
            "avatar": user.avatar_url if user.avatar_url else default_avatar_url,
            "date_joined": user.date_joined.isoformat() if user.date_joined else None,
        }
        return Response(data, status=status.HTTP_200_OK)

    except User.DoesNotExist:
        return Response(
            {"error": "User not found."},
            status=status.HTTP_404_NOT_FOUND
        )
    
    except Exception as e:
        return Response(
            {"error": "An unexpected error occurred.", "details": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
def buyer_signup(request):
    serializer = UserSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        user.is_active = True
        user.is_buyer = True  
        user.is_verified = True
        user.save()
        return Response({"message": "User created successfully"}, status=status.HTTP_201_CREATED)
    else:
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)



@api_view(['POST'])
def create_buyer_profile(request):
    user_id = request.data.get('user_id')

    if not user_id:
        return Response({"error": "user_id is required."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(pk=int(user_id))
    except User.DoesNotExist:
        return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

    if not user.is_active:
        return Response({"error": "User account is not active."}, status=status.HTTP_400_BAD_REQUEST)

    serializer = BuyerProfileSerializer(user, data=request.data, partial=True, context={'request': request})

    if serializer.is_valid():
        updated_user = serializer.save()
        updated_user.email = user.email
        updated_user.is_buyer = True  # ensure the role is set
        updated_user.save()
        return Response({"message": "Buyer profile successfully updated.", "user_id": user.id},
                        status=status.HTTP_200_OK)
    return Response({"error": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_buyer_profile(request):
    user = request.user
    try:
        if user.is_buyer:
            serializer = BuyerProfileSerializer(user)
            return Response(serializer.data, status=status.HTTP_200_OK)
        else:
            return Response({"profile_update": False, "userId": user.id}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            "userId": user.id,
            "success": False,
            "message": "An error occurred while fetching data.",
            "error": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



@require_GET
def check_username_email(request):
    username = request.GET.get('username', None)
    email = request.GET.get('email', None)

    user = (
        User.objects.filter(username__iexact=username).first() or
        User.objects.filter(email__iexact=email).first()
    )

    if user and getattr(user, "is_ban", False):
        data = {
            'username_exists': False,
            'email_exists': False,
            'is_active': None,
            'registered_email': None,
            'banned': True
        }
    else:
        data = {
            'username_exists': User.objects.filter(username__iexact=username, is_ban=False).exists(),
            'email_exists': User.objects.filter(email__iexact=email, is_ban=False).exists(),
            'is_active': user.is_active if user else None,
            'registered_email': user.email if user else None,
            'banned': False
        }

    return JsonResponse(data)





""" Buyers Homepage """

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def buyer_dashboard(request):
    user = request.user

    if not getattr(user, "is_buyer", False):
        return Response({"error": "Only buyers can access this dashboard"}, status=403)

    # --- stats (do NOT call .count() on sliced querysets) ---
    saved_ads_count = SavedAd.objects.filter(user=user).count()
    # messages_count = all messages in chats that include this user (buyer or seller)
    messages_count = Message.objects.filter(Q(chat__buyer=user) | Q(chat__seller=user)).count()
    recently_viewed_count = ViewHistory.objects.filter(user=user).count()

    # --- saved ads (limit 6) ---
    saved_qs = SavedAd.objects.filter(user=user).select_related('ad')[:6]
    saved_ads = []
    for item in saved_qs:
        ad = item.ad
        saved_ads.append({
            "id": ad.id,
            "title": ad.title,
            "price": str(ad.price) if ad.price is not None else None,
            "header_image_url": ad.header_image_url,
            "saved_at": item.saved_at.isoformat()
        })

    # --- recent views (limit 5) ---
    recent_views_qs = ViewHistory.objects.filter(user=user).select_related('ad').order_by('-viewed_at')[:5]
    recent_views = []
    for vh in recent_views_qs:
        ad = vh.ad
        recent_views.append({
            "id": ad.id,
            "title": ad.title,
            "price": str(ad.price) if ad.price is not None else None,
            "header_image_url": ad.header_image_url,
            "viewed_at": vh.viewed_at.isoformat()
        })

    # --- last messages (limit 5) ---
    # Here we return the latest 5 messages from chats where the user is the buyer.
    last_messages_qs = Message.objects.filter(chat__buyer=user).select_related('sender', 'chat__ad').order_by('-created_at')[:5]
    last_messages = []
    for msg in last_messages_qs:
        last_messages.append({
            "id": msg.id,
            "text": msg.text,
            "created_at": msg.created_at.isoformat(),
            "sender_username": msg.sender.username,
            "ad_title": getattr(msg.chat.ad, "title", None)
        })

    # --- recommended ads (limit 20) ---
    recommended_qs = Ad.objects.filter(is_active=True).exclude(user=user).order_by('-created_at')[:20]
    recommended_ads = [
        {
            "id": a.id,
            "title": a.title,
            "price": str(a.price) if a.price is not None else None,
            "header_image_url": a.header_image_url
        } for a in recommended_qs
    ]

    # --- recent orders (limit 5) ---
    orders_qs = Order.objects.filter(user=user).order_by('-created_at')[:5]
    orders = [
        {
            "id": o.id,
            "total": str(o.total),
            "status": o.status,
            "created_at": o.created_at.isoformat()
        } for o in orders_qs
    ]

    data = {
        "user": {
            "firstname": user.first_name,
            "avatar": user.avatar_url or 'https://ik.imagekit.io/ooiob6xdv/boy.png?updatedAt=1754917450889',
            "email": user.email,
            "userId": user.id,
        },
        "stats": {
            "saved_ads_count": saved_ads_count,
            "messages_count": messages_count,
            "recently_viewed_count": recently_viewed_count,
        },
        "saved_ads": saved_ads,
        "recent_views": recent_views,
        "messages": last_messages,
        "recommended_ads": recommended_ads,
        "orders": orders,
    }

    return Response(data)


"""
Chat API Endpoints:
- Create Chat
- Send Message
- Get Messages
- Mark Message as Read
All require authenticated users.
"""

@transaction.atomic
@api_view(["POST"])
def create_chat(request):
    """
    Create or get a chat session between buyer and seller about an Ad.
    Expects 'buyer_id', 'seller_id', 'ad_id' in request.data.

    Deletes previous Chat and Message objects for the same buyer-seller-ad combo to start fresh.
    """
    buyer_id = request.data.get('buyer_id')
    seller_id = request.data.get('seller_id')
    ad_id = request.data.get('ad_id')

    buyer = get_object_or_404(User, id=buyer_id, is_buyer=True)
    seller = get_object_or_404(User, id=seller_id, is_seller=True)
    ad = get_object_or_404(Ad, id=ad_id)

    # Delete existing chats and messages for this buyer-seller-ad combo
    try:
        existing_chats = Chat.objects.filter(ad=ad, buyer=buyer, seller=seller)
        for chat in existing_chats:
            Message.objects.filter(chat=chat).delete()
        existing_chats.delete()
    except Exception as e:
        pass
    chat, created = Chat.objects.get_or_create(ad=ad, buyer=buyer, seller=seller)
    serializer = ChatSerializer(chat)
    return Response(serializer.data, status=status.HTTP_201_CREATED)




def normalize_text_for_firestore(s: str) -> str:
    cleaned = ''.join(
        c for c in s
        if unicodedata.category(c)[0] != 'C' or c in ('\n', '\r')
    )
    return unicodedata.normalize('NFC', cleaned)


@api_view(["POST"])
def send_message(request):
    """
    Send a message in a chat.
    Expects 'chat_id', 'sender_id', 'text' in request.data.
    """
    chat_id = request.data.get('chat_id')
    sender_id = request.data.get('sender_id')
    raw_text = request.data.get('text') or ""

    text = normalize_text_for_firestore(strip_tags(raw_text))

    chat = get_object_or_404(Chat, id=chat_id)
    sender = get_object_or_404(User, id=sender_id)

    # Verify sender is either buyer or seller in this chat
    if sender != chat.buyer and sender != chat.seller:
        return Response({"error": "Sender must be buyer or seller in this chat."}, status=status.HTTP_400_BAD_REQUEST)

    # Create and save the message
    message = Message.objects.create(
        chat=chat,
        sender=sender,
        text=text,
    )

    serializer = MessageSerializer(message)

    firestore_data = {
        'sender_id': sender.id,
        'sender_username': sender.username,
        'text': text,
        'timestamp': firestore.SERVER_TIMESTAMP,
        'avatar': sender.avatar_url if hasattr(sender, 'avatar_url') else None,
        'id': message.id,
        'is_read': message.is_read,
    }

    chat_ref = db.collection('Marketplace_Chats').document(str(chat.id))
    chat_ref.collection('messages').document(str(message.id)).set(firestore_data)

    return Response(serializer.data, status=status.HTTP_201_CREATED)



@api_view(["GET"])
def get_messages(request, chat_id):
    """
    Get all messages for a given chat, ordered by created_at ascending.
    """
    chat = get_object_or_404(Chat, id=chat_id)

    messages = Message.objects.filter(chat=chat).order_by('created_at')
    serializer = MessageSerializer(messages, many=True)

    return Response(serializer.data, status=status.HTTP_200_OK)



@api_view(["POST"])
def mark_chat_read(request, chat_id):
    user = request.user
    chat = get_object_or_404(Chat, id=chat_id)
    Message.objects.filter(
        chat=chat, 
        receiver=user, 
        is_read=False
    ).update(is_read=True)

    return Response({"success": True}, status=status.HTTP_200_OK)


@api_view(["GET"])
def buyer_chats(request, buyer_id):
    buyer = get_object_or_404(User, id=buyer_id, is_buyer=True)
    chats = Chat.objects.filter(buyer=buyer).order_by('-created_at')

    chat_data = []
    for chat in chats:
        last_message = Message.objects.filter(chat=chat).order_by('-created_at').first()
        unread_count = Message.objects.filter(
            chat=chat,
            is_read=False
        ).exclude(sender=buyer).count()

        chat_data.append({
            'chat_id': chat.id,
            'ad_id': chat.ad.id,
            'ad_title': chat.ad.title,
            'seller_name': chat.seller.username,
            'last_message': last_message.text if last_message else "",
            'last_message_time': last_message.created_at if last_message else None,
            'unread': unread_count > 0,
            'unread_count': unread_count
        })

    return Response(chat_data, status=status.HTTP_200_OK)



@api_view(["GET"])
def buyer_orders(request, buyer_id):
    buyer = get_object_or_404(User, id=buyer_id, is_buyer=True)
    orders = Order.objects.filter(user=buyer).order_by('-created_at')

    orders_data = []
    for order in orders:
        orders_data.append({
            'order_id': order.id,
            'ad_id': order.ad.id if order.ad else None,
            'ad_title': order.ad.title if order.ad else "Ad Deleted",
            'total': str(order.total),
            'status': order.status,
            'created_at': order.created_at.strftime("%Y-%m-%d %H:%M"),
        })

    return Response(orders_data, status=status.HTTP_200_OK)


@api_view(['GET'])
def buyer_notifications_list(request, buyer_id):
    notifications = BuyerNotification.objects.filter(buyer_id=buyer_id).order_by('-timestamp')
    serializer = BuyerNotificationSerializer(notifications, many=True)
    return Response(serializer.data)

@api_view(['PATCH'])
def mark_buyer_notification_read(request, notif_id):
    try:
        notif = BuyerNotification.objects.get(pk=notif_id)
        notif.is_read = True
        notif.save()
        return Response({"detail": "Marked as read"}, status=status.HTTP_200_OK)
    except BuyerNotification.DoesNotExist:
        return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)


@transaction.atomic
@api_view(["POST"])
def record_ad_view(request, ad_id):
    """
    Record a view for an ad.
    - If user is authenticated, use request.user.
    - Otherwise, accept {"user_id": <id>} in body.
    Prevent duplicate views within a short time window (5 minutes) to avoid spam.
    """
    ad = get_object_or_404(Ad, id=ad_id)

    # find user
    if request.user and request.user.is_authenticated:
        user = request.user
    else:
        user_id = request.data.get("user_id")
        if not user_id:
            return Response({"detail": "Authentication required or provide user_id."}, status=status.HTTP_400_BAD_REQUEST)
        user = get_object_or_404(User, id=user_id)

    # prevent duplicates in short window (5 minutes)
    now = timezone.now()
    window_start = now - timedelta(minutes=5)

    recent_exists = ViewHistory.objects.filter(user=user, ad=ad, viewed_at__gte=window_start).exists()
    if recent_exists:
        return Response({"detail": "Already recorded recently."}, status=status.HTTP_204_NO_CONTENT)

    vh = ViewHistory.objects.create(user=user, ad=ad)
    return Response({
        "id": vh.id,
        "user_id": user.id,
        "ad_id": ad.id,
        "viewed_at": vh.viewed_at.isoformat()
    }, status=status.HTTP_201_CREATED)



@transaction.atomic
@api_view(["POST", "DELETE"])
def save_unsave_ad(request, ad_id):
    """
    POST /api/ads/<ad_id>/save/   -> create SavedAd
    DELETE /api/ads/<ad_id>/save/ -> remove SavedAd
    Uses request.user if authenticated; falls back to request.data['user_id'] if not.
    """
    ad = get_object_or_404(Ad, id=ad_id)

    if request.user and request.user.is_authenticated:
        user = request.user
    else:
        user_id = request.data.get("user_id") or request.query_params.get("user_id")
        if not user_id:
            return Response({"detail": "Authentication required or provide user_id."}, status=status.HTTP_400_BAD_REQUEST)
        user = get_object_or_404(User, id=user_id)

    if request.method == "POST":
        try:
            saved = SavedAd.objects.create(user=user, ad=ad)
        except IntegrityError:
            return Response({"detail": "Already saved"}, status=status.HTTP_200_OK)
        serializer = SavedAdSerializer(saved)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    else:
        try:
            saved = SavedAd.objects.get(user=user, ad=ad)
            saved.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except SavedAd.DoesNotExist:
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)


@api_view(["GET"])
def buyer_saved_ads(request, buyer_id):
    """
    GET /api/buyer/<buyer_id>/saved-ads/   
    """
    buyer = get_object_or_404(User, id=buyer_id)
    qs = SavedAd.objects.filter(user=buyer).select_related('ad').order_by('-saved_at')
    serializer = SavedAdSerializer(qs, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)




@api_view(['POST'])
@permission_classes([IsAuthenticated])
def application_create(request):
    parser_classes = (MultiPartParser, FormParser)
    
    serializer = ApplicationSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        serializer.save(applicant=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)



@api_view(['GET'])
@permission_classes([IsAuthenticated])
def buyer_applications_list(request):
    user = request.user
    applications = Application.objects.filter(applicant=user).select_related('ad')
    serializer = ApplicationDetailsSerializer(applications, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def buyer_application_detail(request, pk):
    user = request.user
    try:
        application = Application.objects.get(pk=pk, applicant=user)
    except Application.DoesNotExist:
        return Response({'detail': 'Application not found.'}, status=status.HTTP_404_NOT_FOUND)
    
    serializer = ApplicationDetailsSerializer(application)
    return Response(serializer.data)



@api_view(["GET"])
def ad_view_history(request, ad_id):
    """
    Optional: return recent view history for an ad (admin/owners only if desired)
    """
    ad = get_object_or_404(Ad, id=ad_id)
    qs = ViewHistory.objects.filter(ad=ad).select_related('user').order_by('-viewed_at')[:100]
    data = [
        {"id": v.id, "user_id": v.user.id, "username": v.user.username, "viewed_at": v.viewed_at.isoformat()}
        for v in qs
    ]
    return Response(data, status=status.HTTP_200_OK)



@api_view(["GET"])
@permission_classes([IsAuthenticated])
def buyer_view_history(request, buyer_id):
    """
    GET /api/buyer/<buyer_id>/view-history/
    Returns the list of ads viewed by the buyer (user).
    """
    if request.user.id != int(buyer_id):
        return Response({"detail": "Unauthorized."}, status=status.HTTP_403_FORBIDDEN)

    buyer = get_object_or_404(User, id=buyer_id)
    queryset = ViewHistory.objects.filter(user=buyer).select_related('ad').order_by('-viewed_at')
    serializer = ViewHistorySerializer(queryset, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)
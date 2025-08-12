from .models import *
from rest_framework import serializers
from django.contrib.auth.models import User
import re
from django.db import IntegrityError, transaction
import requests
from django.utils.encoding import smart_str
from django.core.files.base import ContentFile
import base64
import imghdr
import binascii
User = get_user_model()

"""
CategorySerializer
Serializes Category model fields: id, name, icon, description.
Used for basic category data representation.
"""
class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'icon','description']


"""
CategoryListSerializer
Custom ListSerializer to bulk create Category instances from validated data.
Improves performance when creating multiple categories at once.
"""
class CategoryListSerializer(serializers.ListSerializer):
    def create(self, validated_data):
        categories = [Category(**item) for item in validated_data]
        return Category.objects.bulk_create(categories)


"""
BulkCategorySerializer
Uses the custom ListSerializer (CategoryListSerializer) for bulk creation support.
Otherwise behaves like CategorySerializer.
"""
class BulkCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'icon','description']
        list_serializer_class = CategoryListSerializer


"""
AdImageSerializer
Serializes AdImage model fields: id, image, image_url.
Represents images associated with ads.
"""
class AdImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdImage
        fields = ['id', 'image','image_url']


"""
AdsSerializer
Serializes Ad model with nested related data:
- images (many AdImage objects)
- category (nested CategorySerializer)
- user info: first name, avatar URL, country
- computed fields: total ads posted by user, member since date, average rating
"""
class AdsSerializer(serializers.ModelSerializer):
    images = AdImageSerializer(many=True, read_only=True)  
    category = CategorySerializer(read_only=True)
    user_first_name = serializers.CharField(source='user.first_name', read_only=True)
    user_avatar_url = serializers.CharField(source='user.avatar_url', read_only=True)
    total_ads_posted = serializers.SerializerMethodField()
    member_since = serializers.SerializerMethodField()
    average_rating = serializers.SerializerMethodField()
    user_country = serializers.CharField(source='user.country', read_only=True)
    seller_id = serializers.IntegerField(source='user.id', read_only=True)

    class Meta:
        model = Ad
        fields = [
            'id', 'title', 'description','user_country','city', 'price', 'currency','status',
            'is_active', 'created_at', 'header_image_url', 'images', 'category','seller_id',
            'user_first_name', 'user_avatar_url', 'total_ads_posted',
            'member_since', 'average_rating'
        ]

    def get_total_ads_posted(self, obj):
        return Ad.objects.filter(user=obj.user).count()

    def get_average_rating(self, obj):
        return obj.user.reviews.aggregate(avg=Avg('rating'))['avg'] or 0
    
    def get_member_since(self, obj):
        return obj.user.date_joined.date() if obj.user.date_joined else None


"""
AdCreateSerializer
Serializer for creating Ad instances.
Includes fields needed when creating an ad.
"""
class AdCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ad
        fields = ['user', 'category', 'title', 'description', 'city', 'price','currency','is_active']


"""
UserSerializer
Serializes User model including password (write-only).
Overrides create() to hash password properly before saving.
"""

class Base64ImageField(serializers.ImageField):
    """
    A Django REST framework field for handling image uploads via base64-encoded strings.
    """

    default_error_messages = {
        "invalid_image": "Invalid image data. Please provide a valid base64-encoded image."
    }

    def to_internal_value(self, data):
        # Check if this is a base64 string
        if isinstance(data, str):
            # Check if the base64 string is in the "data:" format
            if 'data:' in data and ';base64,' in data:
                # Extract the actual base64 content
                _, data = data.split(';base64,')

            # Try to decode the file. Return validation error if it fails.
            try:
                decoded_file = base64.b64decode(data)
            except binascii.Error:
                self.fail("invalid_image")

            # Generate a random file name
            file_name = str(uuid.uuid4())[:12]  # 12-character random name
            # Get the file extension
            file_extension = self.get_file_extension(decoded_file) or "jpg"  # Default to jpg if unknown
            complete_file_name = f"{file_name}.{file_extension}"

            # Create ContentFile instance
            data = ContentFile(decoded_file, name=complete_file_name)

        return super().to_internal_value(data)

    def get_file_extension(self, decoded_file):
        """Determine file extension using imghdr."""
        extension = imghdr.what(None, decoded_file)
        return "jpg" if extension == "jpeg" else extension



def validate_password(value):
    """
    Check that the password meets complexity requirements:
    - At least eight characters long
    - Contains at least one digit
    - Contains at least one uppercase letter
    - Contains at least one lowercase letter
    - Contains at least one special character
    """
    if len(value) < 8:
        raise serializers.ValidationError("Password must be at least 8 characters long.")
    if not re.search(r"\d", value):
        raise serializers.ValidationError("Password must contain at least one digit.")
    if not re.search(r"[A-Z]", value):
        raise serializers.ValidationError("Password must contain at least one uppercase letter.")
    if not re.search(r"[a-z]", value):
        raise serializers.ValidationError("Password must contain at least one lowercase letter.")
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", value):
        raise serializers.ValidationError("Password must contain at least one special character.")
    return value

def validate_username(value):
    """
    Check that the username is unique, ignoring case and normalization:
    - Usernames "Tobi" and "tobi" should be considered the same.
    - Usernames "Nate.Silver" and "nate.silver" should be considered the same.
    """
    normalized_username = value.lower()
    # Check if the username looks like an email address
    if value.split('.')[1] == 'com':
        raise serializers.ValidationError("Username cannot be an email address. Please choose a different username.")

    if User.objects.filter(username__iexact=normalized_username).exists():
        raise serializers.ValidationError("Username already exists. Please choose a different username.")
    return value


def validate_email(value):
    """
    Check that the email is unique, ignoring case and normalization:
    - Emails "vyzio@gmail.com" and "Vyzio@gmail.com" should be considered the same
    """
    normalized_email = value.lower()
    if User.objects.filter(email__iexact=normalized_email).exists():
        raise serializers.ValidationError(
            'Email already exists. Please reset your password or use a new email to signup')
    return value



class UserSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(required=True, validators=[validate_email])
    password1 = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ('username', 'first_name', 'last_name', 'email', 'password1', 'password2')
        extra_kwargs = {
            'username': {'required': True},
            'first_name': {'required': True},
            'last_name': {'required': True},
        }

    def validate(self, attrs):
        if attrs['password1'] != attrs['password2']:
            raise serializers.ValidationError({"password2": "Password fields didn't match."})
        return attrs

    def create(self, validated_data):
        try:
            user = User.objects.create(
                username=validated_data['username'],
                email=validated_data['email'],
                first_name=validated_data['first_name'],
                last_name=validated_data['last_name']
            )
            user.set_password(validated_data['password1'])  # match your validate() usage
            user.is_active = True
            user.save()
            return user
        except IntegrityError:
            raise serializers.ValidationError({
                "username": "This username is already taken. Please choose a different username."
            })


class PasswordUpdateSerializer(serializers.Serializer):
    new_password1 = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    new_password2 = serializers.CharField(write_only=True, required=True)

    def validate(self, attrs):
        if attrs['new_password1'] != attrs['new_password2']:
            raise serializers.ValidationError({"new_password2": "New passwords do not match."})
        return attrs

    def save(self, **kwargs):
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password1'])
        user.save()
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['username']
    def update(self, instance, validated_data):
        instance.username = validated_data.get('username', instance.username)
        instance.save()
        return instance


"""
MessageSerializer
Serializes Message model.
Includes sender's username as read-only field.
"""
class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.username', read_only=True)

    class Meta:
        model = Message
        fields = ['id', 'chat', 'sender', 'sender_name', 'text', 'created_at', 'is_read']


"""
ChatSerializer
Serializes Chat model.
Includes buyer's and seller's usernames as read-only fields.
"""
class ChatSerializer(serializers.ModelSerializer):
    buyer_name = serializers.CharField(source='buyer.username', read_only=True)
    seller_name = serializers.CharField(source='seller.username', read_only=True)

    class Meta:
        model = Chat
        fields = ['id', 'ad', 'buyer', 'seller', 'buyer_name', 'seller_name', 'created_at']


class SellerProfileSerializer(serializers.ModelSerializer):
    avatar = serializers.ImageField(required=False, allow_null=True)
    
    class Meta:
        model = User
        fields = [
            'username', 'email', 'first_name', 'last_name', 'date_of_birth',
            'phone', 'country', 'state', 'address', 'postal_code', 'bio',
            'website', 'preferred_currency', 'avatar', 'avatar_url', 'is_verified', 'kyc_verified',
            'is_seller', 'is_buyer', 'rating',
        ]
        read_only_fields = [
            'avatar_url', 'is_verified', 'kyc_verified', 'is_seller', 'is_buyer', 'rating',
        ]
    
    def update(self, instance, validated_data):
        validated_data.pop('avatar_url', None)
        if 'avatar' in validated_data:
            if hasattr(instance, 'avatar_update'):
                instance.avatar_update = True
        
        required_fields = ['first_name', 'last_name', 'phone', 'date_of_birth', 'country']
        all_filled = all(validated_data.get(field) or getattr(instance, field, None) for field in required_fields)
        
        if all_filled:
            if hasattr(instance, 'profile_completed') and not getattr(instance, 'profile_completed', False):
                instance.profile_completed = True
        
        instance.save()
        
        return super().update(instance, validated_data)


class BuyerProfileSerializer(serializers.ModelSerializer):
    avatar = serializers.ImageField(required=False, allow_null=True)
    
    class Meta:
        model = User
        fields = [
            'username', 'email', 'first_name', 'last_name', 'date_of_birth',
            'phone', 'country', 'state', 'address', 'postal_code', 'bio',
            'website', 'preferred_currency', 'avatar', 'avatar_url', 'is_verified', 'kyc_verified',
            'is_seller', 'is_buyer', 'rating',
        ]
        read_only_fields = [
            'avatar_url', 'is_verified', 'kyc_verified', 'is_seller', 'is_buyer', 'rating',
        ]
    
    def update(self, instance, validated_data):
        # Prevent direct update to avatar_url
        validated_data.pop('avatar_url', None)

        # Track avatar updates
        if 'avatar' in validated_data:
            if hasattr(instance, 'avatar_update'):
                instance.avatar_update = True
        
        # Check required profile fields
        required_fields = ['first_name', 'last_name', 'phone', 'date_of_birth', 'country']
        all_filled = all(validated_data.get(field) or getattr(instance, field, None) for field in required_fields)
        
        if all_filled:
            if hasattr(instance, 'profile_completed') and not getattr(instance, 'profile_completed', False):
                instance.profile_completed = True
        
        instance.save()
        
        return super().update(instance, validated_data)


class BuyerNotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = BuyerNotification
        fields = '__all__'


class SellerNotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = SellerNotification
        fields = '__all__'


class SimpleAdSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ad
        fields = ['id', 'title', 'price', 'currency', 'header_image_url']

class SavedAdSerializer(serializers.ModelSerializer):
    ad = SimpleAdSerializer(read_only=True)
    ad_id = serializers.PrimaryKeyRelatedField(queryset=Ad.objects.all(), source='ad', write_only=True)

    class Meta:
        model = SavedAd
        fields = ['id', 'user', 'ad', 'ad_id', 'saved_at']
        read_only_fields = ['id', 'saved_at', 'ad']



class ApplicationSerializer(serializers.ModelSerializer):
    applicant = serializers.HiddenField(default=serializers.CurrentUserDefault())
    ad = serializers.PrimaryKeyRelatedField(queryset=Ad.objects.all())

    class Meta:
        model = Application
        fields = [
            "id",
            "ad",
            "applicant",
            "cover_letter",
            "resume",
            "resume_url",
            "phone_number",
            "portfolio_url",
            "linkedin_url",
            "expected_salary",
            "available_start_date",
            "is_willing_to_relocate",
            "notes",
            "status",
            "applied_at",
            "updated_at",
        ]
        read_only_fields = ("status", "applied_at", "updated_at", "resume_url")

    def create(self, validated_data):
        return super().create(validated_data)

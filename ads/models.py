from django.utils import timezone
from datetime import timedelta
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.db import transaction
from django.utils.translation import gettext_lazy as _
from django.core.exceptions import ValidationError
from django.core.validators import MaxLengthValidator
from django.contrib.auth import get_user_model  # Updated import
from django.core.validators import FileExtensionValidator, MinValueValidator, MaxValueValidator,MinLengthValidator
from decimal import Decimal
import os
from django.db.models import Avg
import base64
import uuid
import random
import string
from django.contrib.auth.models import AbstractUser, Group, Permission
from django.db import models
from vyzio_backend.settings import IMAGEKIT_API
from imagekitio.models.UploadFileRequestOptions import UploadFileRequestOptions
from django.contrib.auth.models import Group, Permission
from vyzio_backend.settings import AUTH_USER_MODEL


# Upload function, which you're already using
def upload_file_to_imagekit(file_obj, tags):
    filename = file_obj.name
    encoded_file = base64.b64encode(file_obj.read()).decode('utf-8')
    result = IMAGEKIT_API.upload(
        file=encoded_file,
        file_name=filename,
        options=UploadFileRequestOptions(tags=tags)
    )
    return {
        "file_url": result.url,
        "file_id": getattr(result, "file_id", None),
        "file_name": filename
    }


class User(AbstractUser):
    is_advertiser = models.BooleanField(default=False)
    phone = models.CharField(max_length=20, blank=True, null=True)
    country = models.CharField(max_length=50, null=True, default='USA', db_index=True)
    state = models.CharField(max_length=50, blank=True, null=True)
    address = models.CharField(max_length=255, blank=True, null=True)
    postal_code = models.CharField(max_length=20, blank=True, null=True)
    date_of_birth = models.DateField(blank=True, null=True, help_text="Format: YYYY-MM-DD", db_index=True)
    bio = models.TextField(blank=True, null=True, help_text="Short description about the user")
    is_verified = models.BooleanField(default=False)
    kyc_verified = models.BooleanField(default=False)
    website = models.URLField(blank=True, null=True)
    preferred_currency = models.CharField(max_length=10, blank=True, null=True)
    last_seen = models.DateTimeField(blank=True, null=True)
    rating = models.DecimalField(max_digits=3, decimal_places=2, blank=True, null=True)
    is_seller = models.BooleanField(default=False)
    is_buyer = models.BooleanField(default=False)
    avatar_update = models.BooleanField(default=False)
    is_ban = models.BooleanField(default=False)
    profile_completed = models.BooleanField(default=False, help_text="Whether profile has been completed and reward given.")

    avatar = models.ImageField(
        upload_to='avatars/',
        default='https://bit.ly/3YwXaHM',
        blank=True,
        null=True
    )
    avatar_url = models.URLField(blank=True, null=True)

    def __str__(self):
        return self.username
    
    def save(self, *args, **kwargs):
        is_new = self.pk is None
        should_upload = False

        if self.avatar and self.avatar.name != 'https://bit.ly/3YwXaHM':
            if is_new or not self.avatar_url:
                should_upload = True
            else:
                try:
                    orig = User.objects.get(pk=self.pk)
                    if orig.avatar.name != self.avatar.name:
                        should_upload = True
                except User.DoesNotExist:
                    should_upload = True

        if should_upload:
            try:
                result = upload_file_to_imagekit(self.avatar, tags=["user_avatar"])
                file_url = result.get('file_url')
                if file_url:
                    self.avatar_url = file_url
            except Exception as e:
                print(f"Error uploading avatar to ImageKit: {e}")

        super().save(*args, **kwargs)


class Review(models.Model):
    reviewed_user = models.ForeignKey('User',
        on_delete=models.CASCADE,
        related_name="reviews"
    )
    reviewer = models.ForeignKey(
        'User',
        on_delete=models.CASCADE,
        related_name="given_reviews"
    )
    ad = models.ForeignKey(
        'Ad',
        on_delete=models.CASCADE,
        related_name="reviews",
        null=True, blank=True
    )
    rating = models.DecimalField(max_digits=3, decimal_places=2)  
    comment = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Review for {self.reviewed_user} - {self.rating}"



""" Represents ad categories (services, products, jobs, etc.)
Allows easy categorization of ads """
class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    icon = models.CharField(max_length=100, blank=True)
    description = models.TextField(blank=True)

    def __str__(self):
        return self.name


    
""" 
Represents a single ad posted by a user

Linked to a category and a user

Contains details like title, description, price, city, status

 """
class Ad(models.Model):
    user = models.ForeignKey('User', on_delete=models.CASCADE)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True)
    title = models.CharField(max_length=255)
    description = models.TextField()
    city = models.CharField(max_length=100)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='USD') 
    is_active = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    header_image = models.ImageField(upload_to='ads/header/', null=True, blank=True)
    header_image_url = models.URLField(blank=True, null=True)
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('pending', 'Pending Approval'),
        ('active', 'Active'),
        ('paused', 'Paused'),
        ('sold', 'Sold'),
        ('archived', 'Archived'),
    ]

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='draft',
        help_text="Current status of the ad"
    )
    
    def __str__(self):
        return self.title
    
    def save(self, *args, **kwargs):
        """
        Upload header_image to ImageKit only when:
          - instance is new, or
          - there is no existing header_image_url, or
          - the header_image file has changed since last save.
        """
        is_new = self.pk is None
        should_upload = False

        if self.header_image:
            if is_new or not self.header_image_url:
                should_upload = True
            else:
                try:
                    orig = Ad.objects.get(pk=self.pk)
                    if orig.header_image.name != self.header_image.name:
                        should_upload = True
                except Ad.DoesNotExist:
                    should_upload = True

        if should_upload:
            try:
                result = upload_file_to_imagekit(self.header_image, tags=['ad_header_image'])
                file_url = result.get('file_url')
                if file_url:
                    self.header_image_url = file_url
            except Exception as e:
                # log and continue without blocking save
                print(f"Error uploading header image to ImageKit: {e}")

        super().save(*args, **kwargs)
    



""" Allows multiple images per ad """
class AdImage(models.Model):
    ad = models.ForeignKey(Ad, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='ads/extra/')
    image_url = models.URLField(blank=True, null=True)

    def __str__(self):
        return f"Image for {self.ad.title}"
    
    def save(self, *args, **kwargs):
        """
        Upload image to ImageKit only when:
          - instance is new, or
          - there is no existing image_url, or
          - the image file has changed since last save.
        """
        is_new = self.pk is None
        should_upload = False

        if self.image:
            if is_new or not self.image_url:
                should_upload = True
            else:
                try:
                    orig = AdImage.objects.get(pk=self.pk)
                    if orig.image.name != self.image.name:
                        should_upload = True
                except AdImage.DoesNotExist:
                    should_upload = True

        if should_upload:
            try:
                result = upload_file_to_imagekit(self.image, tags=['ad_images'])
                file_url = result.get('file_url')
                if file_url:
                    self.image_url = file_url
            except Exception as e:
                print(f"Error uploading image to ImageKit: {e}")

        super().save(*args, **kwargs)



""" Tracks payments made by users to publish or promote ads

Supports different payment methods and statuses """

class Payment(models.Model):
    PAYMENT_METHODS = [
        ('card', 'Card'),
        ('mobile_money', 'Mobile Money'),
        ('crypto', 'Cryptocurrency'),
    ]

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('failed', 'Failed'),
    ]

    user = models.ForeignKey('User', on_delete=models.CASCADE)
    ad = models.ForeignKey(Ad, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    method = models.CharField(max_length=20, choices=PAYMENT_METHODS)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    crypto_currency = models.CharField(max_length=20, blank=True, null=True)
    currency = models.CharField(max_length=3, default='USD')  
    crypto_address = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} - {self.amount} - {self.status}"


class Chat(models.Model):
    """
    Represents a conversation between two users about a specific ad.
    """
    ad = models.ForeignKey(
        Ad,
        on_delete=models.CASCADE,
        related_name="chats"
    )
    buyer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="buyer_chats"
    )
    seller = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="seller_chats"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('ad', 'buyer', 'seller')  # prevent duplicate chat for same ad & users

    def __str__(self):
        return f"Chat on '{self.ad.title}' between {self.buyer} and {self.seller}"


class Message(models.Model):
    """
    Individual messages within a Chat.
    """
    chat = models.ForeignKey(
        Chat,
        on_delete=models.CASCADE,
        related_name="messages"
    )
    sender = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="sent_messages"
    )
    text = models.TextField(blank=True)
    attachment = models.FileField(
        upload_to="chat_attachments/",
        blank=True,
        null=True,
        validators=[FileExtensionValidator(['jpg', 'jpeg', 'png', 'pdf', 'docx'])]
    )
    attachment_url = models.URLField(blank=True, null=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Message from {self.sender} in Chat {self.chat.id}"

    def save(self, *args, **kwargs):
        """
        If there's an attachment, upload to ImageKit.
        """
        if self.attachment:
            try:
                result = upload_file_to_imagekit(self.attachment, tags=['chat_attachment'])
                file_url = result.get('file_url')
                if file_url:
                    self.attachment_url = file_url
            except Exception as e:
                print(f"Error uploading chat attachment to ImageKit: {e}")

        super().save(*args, **kwargs)


class SavedAd(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="saved_ads")
    ad = models.ForeignKey(Ad, on_delete=models.CASCADE, related_name="saved_by")
    saved_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'ad')

    def __str__(self):
        return f"{self.user} saved {self.ad}"


class ViewHistory(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="viewed_ads")
    ad = models.ForeignKey(Ad, on_delete=models.CASCADE, related_name="viewhistory")
    viewed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-viewed_at']

    def __str__(self):
        return f"{self.user} viewed {self.ad}"


class Order(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('shipped', 'Shipped'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="orders")
    ad = models.ForeignKey(Ad, on_delete=models.SET_NULL, null=True, blank=True, related_name="orders")
    total = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Order #{self.id} by {self.user.username} - {self.status}"


class BuyerNotification(models.Model):
    buyer = models.ForeignKey("User", on_delete=models.CASCADE, db_index=True,related_name="buyer_notifications")

    NOTIFICATION_TYPE_CHOICES = [
        ('message', 'Message'),
        ('payment', 'Payment'),
    ]

    notification_type = models.CharField(
        max_length=30,
        choices=NOTIFICATION_TYPE_CHOICES,
        default='message',
        db_index=True
    )

    # Chat-related fields
    message_chat = models.TextField(blank=True, null=True)
    message_chat_read = models.BooleanField(default=False)
    message_chat_author_id = models.PositiveIntegerField(blank=True, null=True)

    # General notification fields
    message = models.TextField(blank=True, null=True)
    is_read = models.BooleanField(default=False)
    header = models.TextField(blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    avatar = models.ImageField(upload_to='notifications/avatars/', null=True, blank=True)
    attachment = models.URLField(blank=True, null=True)

    # Related marketplace objects
    ad_id = models.PositiveIntegerField(blank=True, null=True)
    seller_id = models.PositiveIntegerField(blank=True, null=True)
    seller_name = models.CharField(max_length=150, blank=True, null=True)
    seller_avatar_url = models.URLField(blank=True, null=True)

    def __str__(self):
        return f"Buyer: {self.buyer.user.username} - {self.header or self.notification_type}"


class SellerNotification(models.Model):
    seller = models.ForeignKey("User", on_delete=models.CASCADE, db_index=True,related_name="seller_notifications")

    NOTIFICATION_TYPE_CHOICES = [
        ('message', 'Message'),
        ('payment', 'Payment'),
        ('new_order', 'New Order'),
        ('order_shipped', 'Order Shipped'),
        ('order_delivered', 'Order Delivered'),
        ('order_cancelled', 'Order Cancelled'),
        ('ad_approved', 'Ad Approved'),
        ('ad_rejected', 'Ad Rejected'),
    ]

    notification_type = models.CharField(
        max_length=30,
        choices=NOTIFICATION_TYPE_CHOICES,
        default='message',
        db_index=True
    )

    preferred_currency = models.CharField(
        max_length=3,
        choices=[('USD', 'US Dollar'), ('NGN', 'Nigerian Naira')],
        default='USD',
        help_text="Preferred currency for transaction info"
    )

    # Chat-related fields
    message_chat = models.TextField(blank=True, null=True)
    message_chat_read = models.BooleanField(default=False)
    message_chat_author_id = models.PositiveIntegerField(blank=True, null=True)

    # Order-related fields
    order_id = models.PositiveIntegerField(blank=True, null=True)
    order_status = models.CharField(max_length=50, blank=True, null=True)
    order_total = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    buyer_id = models.PositiveIntegerField(blank=True, null=True)
    buyer_name = models.CharField(max_length=150, blank=True, null=True)
    buyer_avatar_url = models.URLField(blank=True, null=True)

    # General notification fields
    message = models.TextField(blank=True, null=True)
    is_read = models.BooleanField(default=False)
    header = models.TextField(blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    avatar = models.ImageField(upload_to='notifications/avatars/', null=True, blank=True)
    attachment = models.URLField(blank=True, null=True)

    # Related marketplace objects
    ad_id = models.PositiveIntegerField(blank=True, null=True)

    def __str__(self):
        return f"Seller: {self.seller.user.username} - {self.header or self.notification_type}"



class Application(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('reviewed', 'Reviewed'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
    ]

    ad = models.ForeignKey('Ad', on_delete=models.CASCADE, related_name='applications')
    applicant = models.ForeignKey(User, on_delete=models.CASCADE, related_name='applications')
    cover_letter = models.TextField(blank=True)
    resume = models.FileField(upload_to='applications/resumes/', blank=True, null=True)
    resume_url = models.URLField(blank=True, null=True)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    portfolio_url = models.URLField(blank=True, null=True)
    linkedin_url = models.URLField(blank=True, null=True)
    expected_salary = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    available_start_date = models.DateField(blank=True, null=True)
    is_willing_to_relocate = models.BooleanField(default=False)
    notes = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    applied_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('ad', 'applicant')

    def __str__(self):
        return f"Application by {self.applicant} for {self.ad.title}"

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        should_upload = False

        if self.resume:
            if is_new or not self.resume_url:
                should_upload = True
            else:
                try:
                    orig = Application.objects.get(pk=self.pk)
                    if orig.resume.name != self.resume.name:
                        should_upload = True
                except Application.DoesNotExist:
                    should_upload = True

        if should_upload:
            try:
                result = upload_file_to_imagekit(self.resume, tags=["application_resume"])
                file_url = result.get('file_url')
                if file_url:
                    self.resume_url = file_url
            except Exception as e:
                print(f"Error uploading resume to ImageKit: {e}")

        super().save(*args, **kwargs)
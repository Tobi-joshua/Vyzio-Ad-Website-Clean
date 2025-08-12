import time
from django.db.models.signals import post_save, post_delete, pre_save
from django.dispatch import receiver
from .models import *
from django.http import HttpResponseRedirect
from django.db import transaction
from .views import *
from django.core.exceptions import ObjectDoesNotExist
from .tasks import *
from django.utils import timezone
from datetime import timedelta
from asgiref.sync import async_to_sync
from asgiref.sync import sync_to_async
from django.db import transaction
from vyzio_backend.settings import IMAGEKIT_API
from django.utils.html import format_html
import requests
from django.db.models.signals import m2m_changed
from django.utils.safestring import mark_safe
from django.db.models.signals import pre_delete
import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore
from firebase_admin import auth as firebase_auth
from datetime import datetime
import threading
import requests
import os
from django.db.models import F
import logging
import io
import re
from django.urls import reverse
from django.utils.html import strip_tags

User = get_user_model()
db = firestore.client()


@transaction.atomic
@receiver(post_save, sender=User)
def Welcome_Users(sender, instance, created, **kwargs):
    if created and instance.is_active:
        header = 'WELCOME TO VYZIO ADS'
        user_first_name = instance.first_name or "User"

        if instance.is_buyer:
            BuyerNotification.objects.create(
                buyer=instance,
                header=header,
                message=(
                    f"Hello {user_first_name}! Welcome to Vyzio Ads – your go-to platform "
                    "for discovering the best ad campaigns and growing your business. "
                    "Start exploring, posting your questions, and connecting with trusted sellers today!"
                )
            )
        else:
            SellerNotification.objects.create(
                seller=instance,
                header=header,
                message=(
                    f"Hi {user_first_name}! Thank you for joining Vyzio Ads as a seller. "
                    "Showcase your ad slots, engage with interested buyers, and boost your sales with ease. "
                    "We're here to support your success!"
                )
            )

 
 
@receiver(pre_delete, sender=User)
def delete_user_from_firestore(sender, instance, **kwargs):
    """Signal to remove user from Firestore when deleted."""
    user_ref = db.collection("Users").document(str(instance.id))
    user_ref.delete()


@receiver(post_delete, sender=User)
def delete_buyer_notifications(sender, instance, **kwargs):
    """Triggered when a User instance is deleted."""
    user_id = str(instance.id)  # Use instance.id, not instance.user.id

    if instance.is_buyer:
        # Reference the specific notifications document
        doc_ref = db.collection("Buyer_Notifications").document(user_id)

        # Check if the document exists before deleting
        if doc_ref.get().exists:
            doc_ref.delete()


@receiver(post_delete, sender=User)
def delete_seller_notifications(sender, instance, **kwargs):
    """Triggered when a User instance is deleted."""
    user_id = str(instance.id)  # Use instance.id, not instance.user.id

    if instance.is_seller:
        # Reference the specific notifications document
        doc_ref = db.collection("Seller_Notifications").document(user_id)

        # Check if the document exists before deleting
        if doc_ref.get().exists:
            doc_ref.delete()


@receiver(post_save, sender=User)
def update_user_in_firestore(sender, instance, **kwargs):
    """Signal to create or update Firestore user data when User updates profile."""

    user_ref = db.collection("Users").document(str(instance.id))
    user_snapshot = user_ref.get()

    if instance.is_ban:
        # If user is banned, remove them from Firestore
        user_ref.delete()
    else:
        user_data = {
            "username": instance.username,
            "email": instance.email,
            "firstname": instance.first_name,
            "lastname": instance.last_name,
            "phone": instance.phone,
            "avatar": f"https://api.dicebear.com/7.x/initials/svg?seed={instance.username}"
        }

        if user_snapshot.exists:
            # If the user already exists in Firestore, update their data
            user_ref.update(user_data)
        else:
            # If the user does not exist in Firestore, create a new document
            user_ref.set(user_data)


#  Create Users Collection and Set Values On Firebase
@receiver(post_save, sender=User)
def create_user_in_firestore(sender, instance, created, **kwargs):
    """ Signal to create a Firestore User document when a new User is created in Django """
    if created and instance.is_active:
        user_data = {
            "id": str(instance.id),
            "username": instance.username,
            "firstname":instance.first_name,
            "lastname":instance.last_name,
            "phone":instance.phone,
            "email": instance.email,
            "avatar": f"https://api.dicebear.com/7.x/initials/svg?seed={instance.username}",
        }
        db.collection("Users").document(str(instance.id)).set(user_data)


@receiver(post_delete, sender=Chat)
def delete_chat_from_firebase(sender, instance, **kwargs):
    """
    When a MobileChat is deleted in Django, remove its Firestore document
    and recursively delete all documents in its 'messages' subcollection.
    """
    chat_doc_ref = db.collection('Marketplace_Chats').document(str(instance.id))

    try:
        # Delete all documents in the subcollection "messages"
        messages = chat_doc_ref.collection('messages').stream()
        for message in messages:
            message.reference.delete()
        chat_doc_ref.delete()
    except Exception as e:
        print(f"Error deleting Firebase chat document for MobileChat id {instance.id}: {e}")



@receiver(post_delete, sender=SellerNotification)
def reduce_seller_notification_count(sender, instance, **kwargs):
    """Reduce notification count when a Notification is deleted."""
    doc_ref = db.collection("Seller_Notifications").document(str(instance.seller.id))

    doc = doc_ref.get()
    if doc.exists and doc.to_dict().get("count", 0) > 0:
        doc_ref.update({
            "count": firestore.Increment(-1),
            "timestamp": firestore.SERVER_TIMESTAMP
        })


@receiver(post_delete, sender=BuyerNotification)
def reduce_buyer_notification_count(sender, instance, **kwargs):
    """Reduce notification count when a BuyerNotification is deleted."""
    doc_ref = db.collection("Buyer_Notifications").document(str(instance.buyer.id))

    doc = doc_ref.get()
    if doc.exists and doc.to_dict().get("count", 0) > 0:
        doc_ref.update({
            "count": firestore.Increment(-1),
            "timestamp": firestore.SERVER_TIMESTAMP
        })


############################################## Firestore

@receiver(post_save, sender=SellerNotification)
def update_notification_count(sender, instance, created, **kwargs):
    doc_ref = db.collection("Seller_Notifications").document(str(instance.seller.id))

    if created and not instance.is_read:  
        doc = doc_ref.get()

        if doc.exists:
            doc_ref.update({
                "count": firestore.Increment(1),
                "timestamp": firestore.SERVER_TIMESTAMP
            })
        else:
            doc_ref.set({
                "user_id": str(instance.seller.id),
                "email": instance.seller.email,
                "count": 1,
                "is_read": False,
                "timestamp": firestore.SERVER_TIMESTAMP
            })

    elif not created and instance.is_read: 
        doc = doc_ref.get()
        if doc.exists and doc.to_dict().get("count", 0) > 0:
            doc_ref.update({
                "count": firestore.Increment(-1),
                "timestamp": firestore.SERVER_TIMESTAMP
            })






@receiver(post_save, sender=BuyerNotification)
def update_buyer_notification_count(sender, instance, created, **kwargs):
    doc_ref = db.collection("Buyer_Notifications").document(str(instance.buyer.id))

    if created and not instance.is_read: 
        doc = doc_ref.get()
        if doc.exists:
            doc_ref.update({
                "count": firestore.Increment(1),
                "timestamp": firestore.SERVER_TIMESTAMP,
                "soundTrigger": datetime.utcnow().isoformat()  
            })
        else:
            doc_ref.set({
                "user_id": str(instance.buyer.id),
                "email": instance.buyer.email,
                "count": 1,
                "is_read": False,
                "timestamp": firestore.SERVER_TIMESTAMP,
                "soundTrigger": datetime.utcnow().isoformat()  
            })

    elif not created and instance.is_read:  # Marking as read (decrease count)
        doc = doc_ref.get()
        if doc.exists and doc.to_dict().get("count", 0) > 0:
            doc_ref.update({
                "count": firestore.Increment(-1),
                "timestamp": firestore.SERVER_TIMESTAMP
            })



@transaction.atomic
@receiver(post_save, sender=Message)
def create_message_notification(sender, instance, created, **kwargs):
    if created:
        message = instance
        chat = message.chat
        sender_user = message.sender
        ad_title = chat.ad.title

        if sender_user == chat.buyer:
            recipient = chat.seller
            SellerNotification.objects.create(
                seller=recipient,
                header="New message from buyer",
                message=f"{sender_user.first_name} Says: {message.text}")

        elif sender_user == chat.seller:
            recipient = chat.buyer
            BuyerNotification.objects.create(
                buyer=recipient,
                header="New message from seller",
                message=f"{sender_user.first_name} Says: {message.text}")
from rest_framework import serializers
from .models import CalendarEvent, Notification, NotificationRecipient
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()

class CalendarEventSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = CalendarEvent
        fields = ['id', 'title', 'description', 'start_date', 'end_date', 
                 'created_by', 'created_by_name', 'created_at', 'event_type']
        read_only_fields = ['created_by']

    def get_created_by_name(self, obj):
        return f"{obj.created_by.first_name} {obj.created_by.last_name}".strip() or obj.created_by.username

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)

class NotificationRecipientSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationRecipient
        fields = ['read', 'read_at', 'deleted', 'deleted_at']

class NotificationSerializer(serializers.ModelSerializer):
    sent_by_name = serializers.SerializerMethodField()
    sent_to_ids = serializers.ListField(child=serializers.IntegerField(), write_only=True)
    read = serializers.SerializerMethodField()
    read_at = serializers.SerializerMethodField()
    deleted = serializers.SerializerMethodField()
    recipient_count = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = ['id', 'title', 'message', 'sent_by', 'sent_by_name', 
                 'sent_to_ids', 'created_at', 'related_event', 'read', 'read_at', 
                 'deleted', 'recipient_count']
        read_only_fields = ['sent_by']

    def get_sent_by_name(self, obj):
        if obj.sent_by:
            return f"{obj.sent_by.first_name} {obj.sent_by.last_name}".strip() or obj.sent_by.username
        return "Unknown"

    def get_read(self, obj):
        request = self.context.get('request')
        if request and request.user:
            try:
                recipient = NotificationRecipient.objects.filter(
                    notification=obj, recipient=request.user
                ).first()
                return recipient.read if recipient else False
            except:
                return False
        return False

    def get_read_at(self, obj):
        request = self.context.get('request')
        if request and request.user:
            try:
                recipient = NotificationRecipient.objects.filter(
                    notification=obj, recipient=request.user
                ).first()
                return recipient.read_at if recipient else None
            except:
                return None
        return None

    def get_deleted(self, obj):
        request = self.context.get('request')
        if request and request.user:
            try:
                recipient = NotificationRecipient.objects.filter(
                    notification=obj, recipient=request.user
                ).first()
                return recipient.deleted if recipient else False
            except:
                return False
        return False

    def get_recipient_count(self, obj):
        try:
            return NotificationRecipient.objects.filter(notification=obj).count()
        except:
            return 0

    def create(self, validated_data):
        try:
            sent_to_ids = validated_data.pop('sent_to_ids', [])
            validated_data['sent_by'] = self.context['request'].user
            
            print(f"Creating notification with data: {validated_data}")
            print(f"Recipients: {sent_to_ids}")
            
            notification = super().create(validated_data)
            
            # Create notification recipients
            for user_id in sent_to_ids:
                try:
                    user = User.objects.get(id=user_id)
                    recipient = NotificationRecipient.objects.create(
                        notification=notification,
                        recipient=user
                    )
                    print(f"Created recipient: {recipient}")
                except User.DoesNotExist:
                    print(f"User with id {user_id} not found")
                    continue
                except Exception as e:
                    print(f"Error creating recipient for user {user_id}: {str(e)}")
                    continue
            
            return notification
        except Exception as e:
            print(f"Error creating notification: {str(e)}")
            print(f"Validated data: {validated_data}")
            raise
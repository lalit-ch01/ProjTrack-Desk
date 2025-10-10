from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from .models import CalendarEvent, Notification, NotificationRecipient
from .calendar_serializers import CalendarEventSerializer, NotificationSerializer
from .permissions import IsCoordinator, CanSendNotifications, IsAdminOrCoordinator
from django.contrib.auth import get_user_model
from django.db.models import Q
from django.utils import timezone

User = get_user_model()

class CalendarEventViewSet(viewsets.ModelViewSet):
    queryset = CalendarEvent.objects.all()
    serializer_class = CalendarEventSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [permissions.IsAuthenticated, IsAdminOrCoordinator]
        else:
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]

class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    
    def create(self, request, *args, **kwargs):
        print(f"Creating notification with request data: {request.data}")
        return super().create(request, *args, **kwargs)
    
    def get_queryset(self):
        user = self.request.user
        try:
            if self.action == 'sent':
                # Show sent notifications (not deleted by sender)
                return Notification.objects.filter(sent_by=user, deleted_by_sender=False)
            else:
                # Show received notifications (not deleted)
                # First check if any NotificationRecipient records exist
                if NotificationRecipient.objects.filter(recipient=user).exists():
                    return Notification.objects.filter(
                        notificationrecipient__recipient=user,
                        notificationrecipient__deleted=False
                    ).distinct()
                else:
                    # Return empty queryset if no recipients found
                    return Notification.objects.none()
        except Exception as e:
            print(f"Error in get_queryset: {str(e)}")
            return Notification.objects.none()

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [permissions.IsAuthenticated, CanSendNotifications]
        else:
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]

    @action(detail=False, methods=['get'])
    def sent(self, request):
        """Get all notifications sent by current user (not deleted by sender)"""
        try:
            notifications = Notification.objects.filter(
                sent_by=request.user, 
                deleted_by_sender=False
            )
            serializer = self.get_serializer(notifications, many=True)
            return Response(serializer.data)
        except Exception as e:
            print(f"Error in sent notifications: {str(e)}")
            return Response({'error': str(e)}, status=500)

    @action(detail=False, methods=['get'])
    def unread(self, request):
        """Get unread notifications for current user"""
        try:
            notifications = Notification.objects.filter(
                notificationrecipient__recipient=request.user,
                notificationrecipient__read=False,
                notificationrecipient__deleted=False
            ).distinct()
            serializer = self.get_serializer(notifications, many=True)
            return Response(serializer.data)
        except Exception as e:
            print(f"Error in unread notifications: {str(e)}")
            return Response([])

    @action(detail=True, methods=['post'])
    def mark_as_read(self, request, pk=None):
        """Mark a notification as read"""
        try:
            notification = Notification.objects.get(pk=pk)
            recipient = NotificationRecipient.objects.filter(
                notification=notification, recipient=request.user
            ).first()
            
            if recipient:
                recipient.read = True
                recipient.read_at = timezone.now()
                recipient.save()
                return Response({'status': 'marked as read'})
            return Response({'error': 'Notification not found'}, status=404)
        except Notification.DoesNotExist:
            return Response({'error': 'Notification not found'}, status=404)

    @action(detail=True, methods=['post'])
    def mark_as_unread(self, request, pk=None):
        """Mark a notification as unread"""
        try:
            notification = Notification.objects.get(pk=pk)
            recipient = NotificationRecipient.objects.filter(
                notification=notification, recipient=request.user
            ).first()
            
            if recipient:
                recipient.read = False
                recipient.read_at = None
                recipient.save()
                return Response({'status': 'marked as unread'})
            return Response({'error': 'Notification not found'}, status=404)
        except Notification.DoesNotExist:
            return Response({'error': 'Notification not found'}, status=404)

    @action(detail=True, methods=['post'])
    def delete_notification(self, request, pk=None):
        """Soft delete a notification for current user"""
        try:
            # Try to get the notification directly first
            notification = Notification.objects.get(pk=pk)
            
            # If user is the sender, mark the notification as deleted by sender
            if notification.sent_by == request.user:
                notification.deleted_by_sender = True
                notification.save()
                return Response({'status': 'notification hidden from sent'})
            
            # Otherwise, soft delete for the recipient
            recipient = NotificationRecipient.objects.filter(
                notification=notification, recipient=request.user
            ).first()
            
            if recipient:
                recipient.deleted = True
                recipient.deleted_at = timezone.now()
                recipient.save()
                return Response({'status': 'notification deleted'})
            
            return Response({'error': 'Notification not found or access denied'}, status=404)
            
        except Notification.DoesNotExist:
            return Response({'error': 'Notification not found'}, status=404)

    @action(detail=False, methods=['post'])
    def bulk_action(self, request):
        """Perform bulk actions on notifications"""
        action_type = request.data.get('action')
        notification_ids = request.data.get('notification_ids', [])
        
        if not action_type or not notification_ids:
            return Response({'error': 'action and notification_ids required'}, status=400)
        
        # Check if these are sent notifications (user is sender)
        sent_notifications = Notification.objects.filter(
            id__in=notification_ids,
            sent_by=request.user
        )
        
        # Check if these are received notifications (user is recipient)
        recipients = NotificationRecipient.objects.filter(
            notification_id__in=notification_ids,
            recipient=request.user
        )
        
        count = 0
        
        if action_type == 'delete':
            # Handle sent notifications deletion
            if sent_notifications.exists():
                count += sent_notifications.update(deleted_by_sender=True)
            # Handle received notifications deletion
            if recipients.exists():
                count += recipients.update(deleted=True, deleted_at=timezone.now())
        elif action_type in ['mark_read', 'mark_unread']:
            # Only apply read/unread to received notifications
            if recipients.exists():
                if action_type == 'mark_read':
                    count = recipients.update(read=True, read_at=timezone.now())
                else:  # mark_unread
                    count = recipients.update(read=False, read_at=None)
        else:
            return Response({'error': 'Invalid action'}, status=400)
        
        return Response({'status': f'{action_type} completed for {count} notifications'})

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        """Mark all notifications as read for current user"""
        recipients = NotificationRecipient.objects.filter(
            recipient=request.user,
            read=False,
            deleted=False
        )
        count = recipients.update(read=True, read_at=timezone.now())
        return Response({'status': f'Marked {count} notifications as read'})

    @action(detail=False, methods=['post'])
    def mark_all_unread(self, request):
        """Mark all notifications as unread for current user"""
        recipients = NotificationRecipient.objects.filter(
            recipient=request.user,
            read=True,
            deleted=False
        )
        count = recipients.update(read=False, read_at=None)
        return Response({'status': f'Marked {count} notifications as unread'})
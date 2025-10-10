from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone

class CustomUser(AbstractUser):
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('coordinator', 'Coordinator'),
        ('guide', 'Guide'),
        ('student', 'Student'),
    ]
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='student')
    registration_number = models.CharField(max_length=50, null=True, blank=True)
    department = models.CharField(max_length=100, null=True, blank=True)
    guide = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='guided_students',
        limit_choices_to={'role': 'guide'}
    )
    profile_image = models.ImageField(upload_to='profile_images/', null=True, blank=True)
    description = models.TextField(max_length=500, null=True, blank=True)

    def __str__(self):
        return self.username

    def clean(self):
        from django.core.exceptions import ValidationError
        # Validate registration number uniqueness only if it's provided and not empty
        if self.registration_number and self.registration_number.strip():
            # Check for duplicate registration numbers
            existing_user = CustomUser.objects.filter(
                registration_number=self.registration_number
            ).exclude(pk=self.pk).first()
            
            if existing_user:
                raise ValidationError({
                    'registration_number': 'This registration number is already taken.'
                })

    def save(self, *args, **kwargs):
        # Run clean validation before saving
        self.clean()
        super().save(*args, **kwargs)

    @property
    def guide_name(self):
        if self.guide:
            return f"{self.guide.first_name} {self.guide.last_name}".strip() or self.guide.username
        return None

class CalendarEvent(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    created_by = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='created_events')
    created_at = models.DateTimeField(default=timezone.now)
    event_type = models.CharField(max_length=50, choices=[
        ('REVIEW', 'Project Review'),
        ('SUBMISSION', 'Submission Deadline'),
        ('MEETING', 'Meeting'),
        ('OTHER', 'Other')
    ])
    
    class Meta:
        ordering = ['start_date']

    def __str__(self):
        return self.title

class Notification(models.Model):
    title = models.CharField(max_length=200)
    message = models.TextField()
    sent_by = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='sent_notifications')
    created_at = models.DateTimeField(auto_now_add=True)
    related_event = models.ForeignKey(CalendarEvent, on_delete=models.CASCADE, null=True, blank=True)
    deleted_by_sender = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title

class NotificationRecipient(models.Model):
    notification = models.ForeignKey(Notification, on_delete=models.CASCADE)
    recipient = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ['notification', 'recipient']

    def __str__(self):
        return f"{self.notification.title} - {self.recipient.username}"

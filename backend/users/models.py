from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.conf import settings
import os


def validate_file_extension(value):
    """Validate file extension for uploads"""
    ext = os.path.splitext(value.name)[1].lower()
    if hasattr(settings, 'ALLOWED_SUBMISSION_EXTENSIONS'):
        if ext not in settings.ALLOWED_SUBMISSION_EXTENSIONS:
            raise ValidationError(f'File type {ext} is not allowed.')
    return value


def validate_file_size(value, max_size_mb=50):
    """Validate file size"""
    max_size = max_size_mb * 1024 * 1024  # Convert MB to bytes
    if value.size > max_size:
        raise ValidationError(f'File size cannot exceed {max_size_mb}MB.')
    return value


def syllabus_upload_path(instance, filename):
    """Generate upload path for syllabus files"""
    return f'project_syllabus/{instance.activity_type}/{filename}'


def proposal_upload_path(instance, filename):
    """Generate upload path for proposal documents"""
    return f'topic_proposals/{instance.activity.id}/{instance.submitted_by.id}/{filename}'


def event_submission_upload_path(instance, filename):
    """Generate upload path for event submissions and final reports"""
    if instance.event:
        # For review submissions with calendar events
        return f'event_submissions/{instance.event.id}/{instance.student.id}/{filename}'
    elif instance.activity:
        # For final report submissions tied to activity
        return f'final_reports/{instance.activity.id}/{instance.student.id}/{filename}'
    else:
        # Fallback
        return f'submissions/{instance.student.id}/{filename}'

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
        ('PROJECT_START', 'Project Start'),
        ('PROJECT_END', 'Project End'),
        ('TOPIC_DEADLINE', 'Topic Submission Deadline'),
        ('PRESENTATION', 'Project Presentation'),
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


# Project Management System Models

class ProjectActivity(models.Model):
    """
    Main project activities like Mini Project, Seminar, Major Project, etc.
    Created by coordinators with complete syllabus and requirements.
    """
    ACTIVITY_TYPES = [
        ('mini_project', 'Mini Project'),
        ('major_project', 'Major Project'),
        ('seminar', 'Seminar'),
        ('assignment', 'Assignment'),
        ('research', 'Research Project'),
        ('internship', 'Internship Project'),
    ]
    
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('archived', 'Archived'),
    ]

    title = models.CharField(max_length=200)
    description = models.TextField()
    activity_type = models.CharField(max_length=20, choices=ACTIVITY_TYPES)
    created_by = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='created_activities')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Activity timeline
    start_date = models.DateField()
    end_date = models.DateField()
    topic_submission_deadline = models.DateTimeField()
    
    # Requirements and guidelines
    syllabus = models.FileField(
        upload_to=syllabus_upload_path, 
        null=True, 
        blank=True,
        validators=[validate_file_extension],
        help_text="Upload syllabus document (max 10MB)"
    )
    guidelines = models.TextField(blank=True)
    max_team_size = models.PositiveIntegerField(default=1)
    min_team_size = models.PositiveIntegerField(default=1)
    
    # Status and visibility
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    is_visible_to_students = models.BooleanField(default=True)  # Changed to True by default
    department = models.CharField(max_length=100, null=True, blank=True, help_text="Department this activity belongs to (deprecated)")
    
    # Assignment options
    assigned_to_all_students = models.BooleanField(default=True)
    assigned_students = models.ManyToManyField(
        CustomUser, 
        through='ProjectAssignment',
        through_fields=('activity', 'student'),
        related_name='assigned_activities',
        blank=True
    )

    class Meta:
        ordering = ['-created_at']
        verbose_name_plural = "Project Activities"

    def __str__(self):
        return f"{self.title} ({self.activity_type})"

    @property
    def total_assigned_students(self):
        if self.assigned_to_all_students:
            return CustomUser.objects.filter(role='student').count()
        return self.assigned_students.count()

    @property
    def topics_submitted_count(self):
        return self.topic_submissions.filter(status='submitted').count()

    @property
    def topics_approved_count(self):
        return self.topic_submissions.filter(status='approved').count()


class ProjectAssignment(models.Model):
    """
    Bridge table for activity-student assignment when not assigned to all
    """
    activity = models.ForeignKey(ProjectActivity, on_delete=models.CASCADE)
    student = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    assigned_by = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='project_assignments_made')
    assigned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['activity', 'student']


class TopicSubmission(models.Model):
    """
    Student topic proposals for project activities
    """
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('submitted', 'Submitted'),
        ('under_review', 'Under Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('revision_required', 'Revision Required'),
    ]

    activity = models.ForeignKey(ProjectActivity, on_delete=models.CASCADE, related_name='topic_submissions')
    submitted_by = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='topic_submissions')
    guide = models.ForeignKey(
        CustomUser, 
        on_delete=models.CASCADE, 
        related_name='guided_topics',
        limit_choices_to={'role__in': ['guide', 'admin']}
    )
    
    # Topic details
    topic_title = models.CharField(max_length=300)
    topic_description = models.TextField()
    objectives = models.TextField()
    methodology = models.TextField(blank=True)
    expected_outcomes = models.TextField(blank=True)
    
    # Technology stack
    technologies = models.TextField(help_text="Programming languages, frameworks, tools, etc.")
    domain = models.CharField(max_length=100, help_text="Web Development, AI/ML, Data Science, Mobile App, etc.")
    
    # Timeline and files
    submitted_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    proposal_document = models.FileField(
        upload_to=proposal_upload_path, 
        null=True, 
        blank=True,
        validators=[validate_file_extension],
        help_text="Upload proposal document (max 5MB)"
    )
    
    # Review process
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    review_comments = models.TextField(blank=True)
    reviewed_by = models.ForeignKey(
        CustomUser, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='reviewed_topics'
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-submitted_at']
        unique_together = ['activity', 'submitted_by']  # One topic per student per activity

    def __str__(self):
        return f"{self.topic_title} - {self.submitted_by.username}"


class ProjectReview(models.Model):
    """
    Scheduled reviews for project activities
    """
    activity = models.ForeignKey(ProjectActivity, on_delete=models.CASCADE, related_name='reviews')
    review_number = models.PositiveIntegerField(help_text="Review 1, Review 2, etc.")
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    review_date = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Calendar integration
    calendar_event = models.OneToOneField(
        CalendarEvent, 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True,
        related_name='project_review'
    )
    
    class Meta:
        ordering = ['review_number']
        unique_together = ['activity', 'review_number']
    
    def __str__(self):
        return f"{self.activity.title} - Review {self.review_number}"


class EventSubmission(models.Model):
    """
    Simple submission model for calendar events
    Students can submit work for any event (reviews, topic deadlines, etc.)
    """
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('submitted', 'Submitted'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('revision_required', 'Revision Required'),
    ]

    event = models.ForeignKey(
        CalendarEvent, 
        on_delete=models.CASCADE, 
        related_name='submissions',
        null=True,
        blank=True,
        help_text="Calendar event (for reviews). Null for final reports tied to activity end_date."
    )
    activity = models.ForeignKey(
        ProjectActivity,
        on_delete=models.CASCADE,
        related_name='final_submissions',
        null=True,
        blank=True,
        help_text="Activity (for final reports). Event takes precedence if both are set."
    )
    student = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='event_submissions')
    topic_submission = models.ForeignKey(
        'TopicSubmission', 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True,
        related_name='event_submissions',
        help_text="Link to student's project topic if applicable"
    )
    
    # Submission details
    submission_text = models.TextField(blank=True, help_text="Description or notes about the submission")
    submission_files = models.FileField(
        upload_to=event_submission_upload_path, 
        null=True, 
        blank=True,
        validators=[validate_file_extension],
        help_text="Upload submission files"
    )
    
    # Status and timestamps
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    submitted_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # File metadata
    file_size_bytes = models.BigIntegerField(null=True, blank=True)
    original_filename = models.CharField(max_length=255, blank=True)
    
    # Evaluation (simple grade and feedback)
    grade = models.CharField(max_length=10, blank=True, help_text="Grade: A+, A, B+, B, C+, C, D, F")
    score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, help_text="Score out of 100")
    feedback = models.TextField(blank=True)
    evaluated_by = models.ForeignKey(
        CustomUser, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='evaluated_submissions'
    )
    evaluated_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-submitted_at']
        # Allow multiple submissions per student per event (for revisions)
    
    def __str__(self):
        if self.event:
            return f"{self.event.title} - {self.student.username} ({self.status})"
        elif self.activity:
            return f"Final Report: {self.activity.title} - {self.student.username} ({self.status})"
        return f"Submission by {self.student.username} ({self.status})"
    
    def clean(self):
        """Validate that either event or activity is provided"""
        from django.core.exceptions import ValidationError
        if not self.event and not self.activity:
            raise ValidationError("Either event or activity must be specified for a submission.")
    
    def save(self, *args, **kwargs):
        # Set file metadata
        if self.submission_files:
            self.file_size_bytes = self.submission_files.size
            self.original_filename = self.submission_files.name
        
        super().save(*args, **kwargs)

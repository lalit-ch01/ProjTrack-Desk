# users/project_serializers.py
# Project Management Serializers

from rest_framework import serializers
from .models import (
    ProjectActivity, TopicSubmission,
    CalendarEvent, CustomUser, ProjectReview, EventSubmission
)

class ProjectActivitySerializer(serializers.ModelSerializer):
    """Serializer for Project Activities (Mini Project, Seminar, etc.)"""
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    total_assigned_students = serializers.ReadOnlyField()
    topics_submitted_count = serializers.ReadOnlyField()
    topics_approved_count = serializers.ReadOnlyField()
    syllabus_url = serializers.SerializerMethodField()
    reviews = serializers.SerializerMethodField()
    
    class Meta:
        model = ProjectActivity
        fields = [
            'id', 'title', 'description', 'activity_type', 'created_by', 'created_by_name',
            'created_at', 'updated_at', 'start_date', 'end_date', 'topic_submission_deadline',
            'syllabus', 'syllabus_url', 'guidelines', 'max_team_size', 'min_team_size',
            'status', 'is_visible_to_students', 'assigned_to_all_students', 'department',
            'total_assigned_students', 'topics_submitted_count', 'topics_approved_count', 'reviews'
        ]
        read_only_fields = ['created_by', 'created_at', 'updated_at']
    
    def get_reviews(self, obj):
        """Get scheduled reviews for this activity"""
        try:
            from .models import ProjectReview
            reviews = ProjectReview.objects.filter(activity=obj).order_by('review_number')
            return [{
                'id': r.id,
                'review_number': r.review_number,
                'title': r.title,
                'review_date': r.review_date,
            } for r in reviews]
        except:
            return []

    def get_syllabus_url(self, obj):
        if obj.syllabus:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.syllabus.url)
        return None

    def create(self, validated_data):
        # Set the created_by field to the current user
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class ProjectReviewSerializer(serializers.ModelSerializer):
    """Serializer for Project Reviews"""
    activity_title = serializers.CharField(source='activity.title', read_only=True)
    
    class Meta:
        model = ProjectReview
        fields = ['id', 'activity', 'activity_title', 'review_number', 'title', 'description', 'review_date', 'calendar_event', 'created_at']
        read_only_fields = ['created_at', 'calendar_event']
    
    def create(self, validated_data):
        from .models import ProjectReview, CalendarEvent
        
        review = ProjectReview.objects.create(**validated_data)
        
        # Create calendar event for review
        calendar_event = CalendarEvent.objects.create(
            title=f"{review.activity.title} - {review.title}",
            description=review.description or f"Review {review.review_number} for {review.activity.title}",
            start_date=review.review_date,
            end_date=review.review_date,
            created_by=review.activity.created_by,
            event_type='REVIEW'
        )
        review.calendar_event = calendar_event
        review.save()
        
        return review


class TopicSubmissionSerializer(serializers.ModelSerializer):
    """Serializer for student topic submissions"""
    submitted_by_name = serializers.CharField(source='submitted_by.get_full_name', read_only=True)
    guide_name = serializers.CharField(source='guide.get_full_name', read_only=True)
    activity_title = serializers.CharField(source='activity.title', read_only=True)
    reviewed_by_name = serializers.CharField(source='reviewed_by.get_full_name', read_only=True)
    proposal_document_url = serializers.SerializerMethodField()
    can_edit = serializers.SerializerMethodField()
    
    class Meta:
        model = TopicSubmission
        fields = [
            'id', 'activity', 'activity_title', 'submitted_by', 'submitted_by_name',
            'guide', 'guide_name', 'topic_title', 'topic_description', 'objectives',
            'methodology', 'expected_outcomes', 'technologies', 'domain',
            'submitted_at', 'updated_at', 'proposal_document', 'proposal_document_url',
            'status', 'review_comments', 'reviewed_by', 'reviewed_by_name', 'reviewed_at',
            'can_edit'
        ]
        read_only_fields = ['submitted_by', 'guide', 'submitted_at', 'updated_at', 'reviewed_at']

    def get_proposal_document_url(self, obj):
        if obj.proposal_document:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.proposal_document.url)
        return None

    def get_can_edit(self, obj):
        """Check if the current user can edit this topic submission"""
        request = self.context.get('request')
        if not request or not request.user:
            return False
        
        # Student can edit only their own draft/revision_required submissions
        if request.user.role == 'student':
            return (obj.submitted_by == request.user and 
                   obj.status in ['draft', 'revision_required'])
        
        # Guides can edit if it's their student and needs review
        if request.user.role == 'guide':
            return (obj.guide == request.user and 
                   obj.status in ['submitted', 'under_review'])
        
        # Coordinators and admins can always edit
        return request.user.role in ['coordinator', 'admin']

    def create(self, validated_data):
        validated_data['submitted_by'] = self.context['request'].user
        return super().create(validated_data)


class EventSubmissionSerializer(serializers.ModelSerializer):
    """Serializer for event submissions (reviews and final reports)"""
    student_name = serializers.CharField(source='student.get_full_name', read_only=True)
    event_title = serializers.CharField(source='event.title', read_only=True)
    activity_title = serializers.CharField(source='activity.title', read_only=True)
    topic_title = serializers.CharField(source='topic_submission.topic_title', read_only=True)
    evaluated_by_name = serializers.CharField(source='evaluated_by.get_full_name', read_only=True)
    submission_file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = EventSubmission
        fields = [
            'id', 'event', 'event_title', 'activity', 'activity_title', 'student', 'student_name', 
            'topic_submission', 'topic_title', 'submission_text', 'submission_files',
            'submission_file_url', 'status', 'submitted_at', 'updated_at',
            'file_size_bytes', 'original_filename', 'grade', 'score', 'feedback',
            'evaluated_by', 'evaluated_by_name', 'evaluated_at'
        ]
        read_only_fields = ['student', 'submitted_at', 'updated_at', 'file_size_bytes', 'original_filename']
    
    def get_submission_file_url(self, obj):
        if obj.submission_files:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.submission_files.url)
        return None
    
    def create(self, validated_data):
        # Auto-set student to current user if not provided
        if 'student' not in validated_data:
            validated_data['student'] = self.context['request'].user
        return super().create(validated_data)

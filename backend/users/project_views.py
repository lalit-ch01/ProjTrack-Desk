# users/project_views.py
# Project Management API Views

from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.utils import timezone
from django.db.models import Q

from .models import (
    ProjectActivity, TopicSubmission, 
    CalendarEvent, CustomUser, EventSubmission
)
from .project_serializers import (
    ProjectActivitySerializer, TopicSubmissionSerializer,
    ProjectReviewSerializer, EventSubmissionSerializer
)
from .permissions import IsAdmin, IsCoordinator, IsAdminOrCoordinator


class ProjectActivityViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Project Activities (Mini Project, Seminar, etc.)
    
    - ONLY Coordinators can create and manage project activities
    - Students can view assigned activities
    - Guides can view activities of their students
    """
    serializer_class = ProjectActivitySerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['activity_type', 'status', 'assigned_to_all_students']
    search_fields = ['title', 'description']
    ordering_fields = ['created_at', 'start_date', 'end_date']
    ordering = ['-created_at']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'activate', 'deactivate']:
            return [IsCoordinator()]  # Only coordinators can manage activities
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        
        if user.role in ['admin', 'coordinator']:
            # Admin and coordinators see all activities
            return ProjectActivity.objects.all()
        elif user.role == 'guide':
            # Guides see all activities (no department filter)
            queryset = ProjectActivity.objects.filter(
                Q(assigned_to_all_students=True) |
                Q(assigned_students__guide=user)
            )
            return queryset.distinct()
        elif user.role == 'student':
            # Students see all visible activities (no department filter)
            queryset = ProjectActivity.objects.filter(
                Q(assigned_to_all_students=True, is_visible_to_students=True) |
                Q(assigned_students=user, is_visible_to_students=True)
            )
            return queryset.distinct()
        
        return ProjectActivity.objects.none()
    
    def perform_create(self, serializer):
        """Create activity with calendar events"""
        user = self.request.user
        
        # Department filtering deprecated - all activities visible to all users
        # is_visible_to_students and assigned_to_all_students default to True in model
        activity = serializer.save(created_by=user)
        
        # Create calendar events for the activity
        self._create_calendar_events(activity)
        
    def perform_update(self, serializer):
        """Update activity and related calendar events"""
        activity = serializer.save()
        
        # Update calendar events if dates changed
        self._update_calendar_events(activity)
    
    def perform_destroy(self, instance):
        """Delete activity and all related calendar events"""
        # Delete all calendar events related to this activity
        deleted_count = self._delete_activity_calendar_events(instance)
        
        # Delete all review calendar events
        from .models import ProjectReview
        reviews = ProjectReview.objects.filter(activity=instance)
        for review in reviews:
            if review.calendar_event:
                review.calendar_event.delete()
        
        # Now delete the activity itself
        instance.delete()
    
    def _delete_activity_calendar_events(self, activity):
        """Delete all calendar events related to this activity"""
        deleted_count = 0
        
        # Delete activity-related events (start, topic deadline, end)
        events_deleted = CalendarEvent.objects.filter(
            Q(title__startswith=f"{activity.title} - Start") |
            Q(title__startswith=f"{activity.title} - Topic Deadline") |
            Q(title__startswith=f"{activity.title} - End")
        ).delete()
        deleted_count += events_deleted[0] if events_deleted else 0
        
        # Delete review calendar events
        from .models import ProjectReview
        reviews = ProjectReview.objects.filter(activity=activity)
        for review in reviews:
            if review.calendar_event:
                review.calendar_event.delete()
                deleted_count += 1
        
        return deleted_count
    
    def _create_calendar_events(self, activity):
        """Create calendar events for activity milestones"""
        # Project start event
        CalendarEvent.objects.create(
            title=f"{activity.title} - Start",
            description=f"Project activity starts: {activity.description}",
            start_date=timezone.make_aware(timezone.datetime.combine(activity.start_date, timezone.datetime.min.time())),
            end_date=timezone.make_aware(timezone.datetime.combine(activity.start_date, timezone.datetime.min.time())),
            created_by=activity.created_by,
            event_type='PROJECT_START'
        )
        
        # Topic submission deadline event
        CalendarEvent.objects.create(
            title=f"{activity.title} - Topic Deadline",
            description=f"Topic submission deadline for {activity.title}",
            start_date=activity.topic_submission_deadline,
            end_date=activity.topic_submission_deadline,
            created_by=activity.created_by,
            event_type='TOPIC_DEADLINE'
        )
        
        # Project end event
        CalendarEvent.objects.create(
            title=f"{activity.title} - End",
            description=f"Project activity ends: {activity.title}",
            start_date=timezone.make_aware(timezone.datetime.combine(activity.end_date, timezone.datetime.min.time())),
            end_date=timezone.make_aware(timezone.datetime.combine(activity.end_date, timezone.datetime.min.time())),
            created_by=activity.created_by,
            event_type='PROJECT_END'
        )
    
    def _update_calendar_events(self, activity):
        """Update existing calendar events when activity dates change"""
        # Delete old events and recreate (simpler than selective update)
        CalendarEvent.objects.filter(
            title__startswith=activity.title,
            created_by=activity.created_by
        ).delete()
        self._create_calendar_events(activity)

    @action(detail=True, methods=['post'])
    def assign_students(self, request, pk=None):
        """Assign specific students to a project activity"""
        activity = self.get_object()
        
        if request.user.role not in ['admin', 'coordinator']:
            return Response(
                {'error': 'Only coordinators can assign students'},
                status=status.HTTP_403_FORBIDDEN
            )

        student_ids = request.data.get('student_ids', [])
        if not student_ids:
            return Response(
                {'error': 'student_ids required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        students = CustomUser.objects.filter(id__in=student_ids, role='student')
        activity.assigned_students.set(students)
        activity.assigned_to_all_students = False
        activity.save()

        return Response({
            'message': f'Activity assigned to {students.count()} students',
            'assigned_count': students.count()
        })

    @action(detail=True, methods=['get'])
    def topic_submissions(self, request, pk=None):
        """Get all topic submissions for this activity"""
        activity = self.get_object()
        submissions = activity.topic_submissions.all()
        
        # Filter based on user role
        if request.user.role == 'guide':
            submissions = submissions.filter(guide=request.user)
        elif request.user.role == 'student':
            submissions = submissions.filter(submitted_by=request.user)
        
        serializer = TopicSubmissionSerializer(submissions, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def progress_summary(self, request, pk=None):
        """Get progress summary for this activity"""
        activity = self.get_object()
        
        if request.user.role not in ['admin', 'coordinator']:
            return Response(
                {'error': 'Access denied'},
                status=status.HTTP_403_FORBIDDEN
            )

        total_students = activity.total_assigned_students
        topics_submitted = activity.topics_submitted_count
        topics_approved = activity.topics_approved_count
        
        return Response({
            'activity_id': activity.id,
            'activity_title': activity.title,
            'total_students': total_students,
            'topics_submitted': topics_submitted,
            'topics_approved': topics_approved,
            'submission_rate': (topics_submitted / total_students * 100) if total_students > 0 else 0,
            'approval_rate': (topics_approved / topics_submitted * 100) if topics_submitted > 0 else 0
        })

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """
        Activate a project activity - makes it visible to students
        and sends notifications
        """
        activity = self.get_object()
        
        if request.user.role != 'coordinator':
            return Response(
                {'error': 'Only coordinators can activate activities'},
                status=status.HTTP_403_FORBIDDEN
            )

        if activity.status == 'active':
            return Response(
                {'message': 'Activity is already active'},
                status=status.HTTP_200_OK
            )

        # Change status to active
        activity.status = 'active'
        activity.is_visible_to_students = True
        activity.save()

        # Create/recreate calendar events if needed
        if not CalendarEvent.objects.filter(
            title__startswith=activity.title,
            created_by=activity.created_by
        ).exists():
            self._create_calendar_events(activity)

        # TODO: Send notifications to students
        # For now, just return success message
        
        return Response({
            'message': f'Activity "{activity.title}" activated successfully',
            'status': activity.status,
            'visible_to_students': activity.is_visible_to_students
        })

    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        """Deactivate/archive a project activity and delete related calendar events"""
        activity = self.get_object()
        
        if request.user.role != 'coordinator':
            return Response(
                {'error': 'Only coordinators can deactivate activities'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Delete all related calendar events
        deleted_count = self._delete_activity_calendar_events(activity)

        activity.status = 'archived'
        activity.is_visible_to_students = False
        activity.save()
        
        return Response({
            'message': f'Activity "{activity.title}" deactivated and {deleted_count} calendar events deleted',
            'status': activity.status
        })


class TopicSubmissionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Topic Submissions
    
    - Students can create and edit their topic submissions
    - Guides can review and approve/reject topics
    - Coordinators can view all submissions
    """
    serializer_class = TopicSubmissionSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['activity', 'status', 'guide', 'domain']
    search_fields = ['topic_title', 'topic_description', 'technologies']
    ordering_fields = ['submitted_at', 'updated_at']
    ordering = ['-submitted_at']

    def get_permissions(self):
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        
        if user.role in ['admin', 'coordinator']:
            return TopicSubmission.objects.all()
        elif user.role == 'guide':
            return TopicSubmission.objects.filter(guide=user)
        elif user.role == 'student':
            return TopicSubmission.objects.filter(submitted_by=user)
        
        return TopicSubmission.objects.none()

    def perform_create(self, serializer):
        # Auto-assign the student's guide to the topic submission
        student = self.request.user
        
        # Check if student has an assigned guide
        if not student.guide:
            raise ValidationError({
                'error': 'You must have an assigned guide before submitting a topic. Please contact your coordinator.'
            })
        
        # Save with the student's assigned guide
        instance = serializer.save(
            submitted_by=student,
            guide=student.guide
        )

    @action(detail=False, methods=['get'])
    def pending_approval(self, request):
        """Get all topics pending approval for the guide"""
        if request.user.role not in ['guide', 'coordinator', 'admin']:
            return Response(
                {'error': 'Only guides can view pending approvals'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # For guides, show their students' submitted topics
        if request.user.role == 'guide':
            topics = TopicSubmission.objects.filter(
                guide=request.user,
                status='submitted'
            ).order_by('-submitted_at')
        else:
            # Coordinators see all submitted topics
            topics = TopicSubmission.objects.filter(
                status='submitted'
            ).order_by('-submitted_at')
        
        serializer = self.get_serializer(topics, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def my_students_topics(self, request):
        """Get all topics from guide's students (all statuses)"""
        if request.user.role not in ['guide', 'coordinator', 'admin']:
            return Response(
                {'error': 'Only guides can view student topics'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # For guides, show all their students' topics
        if request.user.role == 'guide':
            topics = TopicSubmission.objects.filter(
                guide=request.user
            ).order_by('-submitted_at')
        else:
            # Coordinators see all topics
            topics = TopicSubmission.objects.all().order_by('-submitted_at')
        
        # Apply status filter if provided
        status_filter = request.query_params.get('status', None)
        if status_filter:
            topics = topics.filter(status=status_filter)
        
        serializer = self.get_serializer(topics, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def approve_topic(self, request, pk=None):
        """Approve a topic submission (Guide/Coordinator only)"""
        topic = self.get_object()
        
        if request.user.role not in ['guide', 'coordinator', 'admin']:
            return Response(
                {'error': 'Only guides can approve topics'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if request.user.role == 'guide' and topic.guide != request.user:
            return Response(
                {'error': 'You can only approve topics assigned to you'},
                status=status.HTTP_403_FORBIDDEN
            )

        topic.status = 'approved'
        topic.reviewed_by = request.user
        topic.reviewed_at = timezone.now()
        topic.review_comments = request.data.get('comments', '')
        topic.save()

        return Response({
            'message': 'Topic approved successfully',
            'topic_id': topic.id,
            'status': topic.status
        })

    # Removed reject_topic - guides can only approve or request revision
    # @action(detail=True, methods=['post'])
    # def reject_topic(self, request, pk=None):
    #     """Reject a topic submission - DISABLED: Guides should only approve or request revision"""
    #     pass

    @action(detail=True, methods=['post'])
    def request_revision(self, request, pk=None):
        """Request revision on a topic submission"""
        topic = self.get_object()
        
        if request.user.role not in ['guide', 'coordinator', 'admin']:
            return Response(
                {'error': 'Only guides can request revisions'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if request.user.role == 'guide' and topic.guide != request.user:
            return Response(
                {'error': 'You can only review topics assigned to you'},
                status=status.HTTP_403_FORBIDDEN
            )

        comments = request.data.get('comments', '')
        if not comments:
            return Response(
                {'error': 'Comments are required when requesting revision'},
                status=status.HTTP_400_BAD_REQUEST
            )

        topic.status = 'revision_required'
        topic.reviewed_by = request.user
        topic.reviewed_at = timezone.now()
        topic.review_comments = comments
        topic.save()

        # TODO: Send notification to student with revision comments
        
        return Response({
            'message': 'Revision requested successfully',
            'topic_id': topic.id,
            'status': topic.status,
            'comments': comments
        })

    @action(detail=False, methods=['get'])
    def pending_approval(self, request):
        """Get topics pending approval for the guide"""
        if request.user.role not in ['guide', 'coordinator', 'admin']:
            return Response(
                {'error': 'Only guides can access pending approvals'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if request.user.role == 'guide':
            topics = TopicSubmission.objects.filter(
                guide=request.user,
                status='submitted'
            )
        else:
            topics = TopicSubmission.objects.filter(status='submitted')
        
        serializer = self.get_serializer(topics, many=True)
        return Response(serializer.data)


class ProjectReviewViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Project Reviews
    
    - Coordinators can create and manage review schedules
    - All users can view reviews for their relevant projects
    """
    serializer_class = ProjectReviewSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['activity', 'review_number']
    ordering = ['activity', 'review_number']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrCoordinator()]
        return [IsAuthenticated()]

    def get_queryset(self):
        from .models import ProjectReview
        user = self.request.user
        
        if user.role in ['admin', 'coordinator']:
            return ProjectReview.objects.all()
        elif user.role == 'guide':
            # Guides see reviews for activities they're involved in
            return ProjectReview.objects.filter(
                activity__topic_submissions__guide=user
            ).distinct()
        elif user.role == 'student':
            # Students see reviews for activities they're assigned to
            return ProjectReview.objects.filter(
                Q(activity__assigned_to_all_students=True) |
                Q(activity__assigned_students=user)
            ).distinct()
        
        return ProjectReview.objects.none()

    def perform_create(self, serializer):
        """Create review and automatically create calendar event"""
        review = serializer.save()
        
        # Create calendar event for this review
        if not review.calendar_event:
            calendar_event = CalendarEvent.objects.create(
                title=f"{review.activity.title} - Review {review.review_number}",
                description=review.description or f"Review #{review.review_number} for {review.activity.title}",
                start_date=review.review_date,
                end_date=review.review_date,
                created_by=self.request.user,
                event_type='REVIEW'
            )
            review.calendar_event = calendar_event
            review.save()
        
        # TODO: Send notifications to all students and guides in the activity
        
        return review

    def perform_update(self, serializer):
        """Update review and its calendar event"""
        review = serializer.save()
        
        # Update calendar event if it exists
        if review.calendar_event:
            review.calendar_event.title = f"{review.activity.title} - Review {review.review_number}"
            review.calendar_event.description = review.description or f"Review #{review.review_number}"
            review.calendar_event.start_date = review.review_date
            review.calendar_event.end_date = review.review_date
            review.calendar_event.save()
        
        return review


class EventSubmissionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Event Submissions
    
    - Students can submit work for any calendar event
    - Guides/Coordinators can evaluate submissions
    """
    serializer_class = EventSubmissionSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter, SearchFilter]
    filterset_fields = ['event', 'activity', 'student', 'status', 'topic_submission']
    ordering = ['-submitted_at']
    search_fields = ['submission_text', 'student__username']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update']:
            return [IsAuthenticated()]
        elif self.action in ['destroy']:
            return [IsAdminOrCoordinator()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        
        if user.role in ['admin', 'coordinator']:
            # Admins and coordinators see all submissions
            return EventSubmission.objects.all()
        elif user.role == 'guide':
            # Guides see submissions from their students
            # Include both topic_submission-linked and student-guide relationship
            from django.db.models import Q
            return EventSubmission.objects.filter(
                Q(topic_submission__guide=user) | Q(student__guide=user)
            ).distinct()
        elif user.role == 'student':
            # Students see only their own submissions
            return EventSubmission.objects.filter(student=user)
        
        return EventSubmission.objects.none()
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def evaluate(self, request, pk=None):
        """
        Evaluate a submission (for guides/coordinators)
        """
        submission = self.get_object()
        
        # Check if user can evaluate
        if request.user.role not in ['guide', 'coordinator', 'admin']:
            return Response(
                {'detail': 'Only guides and coordinators can evaluate submissions.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Validate that submission is in submitted status
        if submission.status == 'draft':
            return Response(
                {'error': 'Cannot evaluate draft submissions'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get and validate evaluation data
        new_status = request.data.get('status')
        if new_status not in ['approved', 'revision_required']:
            return Response(
                {'error': 'Status must be approved or revision_required. Guides cannot reject submissions.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Feedback required for revision
        feedback = request.data.get('feedback', '')
        if new_status == 'revision_required' and not feedback:
            return Response(
                {'error': 'Feedback is required when requesting revision'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update evaluation fields
        submission.grade = request.data.get('grade', submission.grade)
        submission.score = request.data.get('score', submission.score)
        submission.feedback = feedback
        submission.status = new_status
        submission.evaluated_by = request.user
        submission.evaluated_at = timezone.now()
        submission.save()
        
        # TODO: Send notification to student
        
        serializer = self.get_serializer(submission)
        return Response({
            'message': f'Submission {new_status} successfully',
            'submission': serializer.data
        })

    @action(detail=False, methods=['get'])
    def pending_evaluation(self, request):
        """Get submissions pending evaluation for the guide"""
        if request.user.role not in ['guide', 'coordinator', 'admin']:
            return Response(
                {'error': 'Only guides can access pending evaluations'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if request.user.role == 'guide':
            submissions = EventSubmission.objects.filter(
                topic_submission__guide=request.user,
                status='submitted'
            )
        else:
            submissions = EventSubmission.objects.filter(status='submitted')
        
        serializer = self.get_serializer(submissions, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def my_submissions(self, request):
        """Get current student's submissions"""
        if request.user.role != 'student':
            return Response(
                {'error': 'Only students can access this endpoint'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        submissions = EventSubmission.objects.filter(student=request.user)
        serializer = self.get_serializer(submissions, many=True)
        return Response(serializer.data)
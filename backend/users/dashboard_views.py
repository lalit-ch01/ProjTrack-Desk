from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Count, Q, Avg
from django.utils import timezone
from datetime import timedelta
from .models import (
    ProjectActivity, TopicSubmission, CalendarEvent, EventSubmission
)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def workflow_dashboard_stats(request):
    """
    Get comprehensive workflow statistics for dashboard
    """
    user = request.user
    
    # Base queries - filter based on user role
    if user.role == 'student':
        activities = ProjectActivity.objects.filter(assigned_students=user)
        topics = TopicSubmission.objects.filter(student=user)
        submissions = MilestoneSubmission.objects.filter(student=user)
    elif user.role == 'guide' or user.role == 'faculty':
        topics = TopicSubmission.objects.filter(guide=user)
        activities = ProjectActivity.objects.filter(
            Q(topicsubmission__guide=user) | Q(coordinator=user)
        ).distinct()
        submissions = MilestoneSubmission.objects.filter(
            milestone__project_activity__topicsubmission__guide=user
        ).distinct()
    elif user.role == 'coordinator':
        activities = ProjectActivity.objects.filter(coordinator=user)
        topics = TopicSubmission.objects.filter(activity__coordinator=user)
        submissions = MilestoneSubmission.objects.filter(
            milestone__project_activity__coordinator=user
        )
    else:  # admin
        activities = ProjectActivity.objects.all()
        topics = TopicSubmission.objects.all()
        submissions = MilestoneSubmission.objects.all()
    
    # Calculate statistics
    stats = {
        # Activity Stats
        'total_activities': activities.count(),
        'active_activities': activities.filter(status='active').count(),
        'completed_activities': activities.filter(status='completed').count(),
        
        # Topic Stats
        'total_topics': topics.count(),
        'pending_topics': topics.filter(status='submitted').count(),
        'approved_topics': topics.filter(status='approved').count(),
        'rejected_topics': topics.filter(status='rejected').count(),
        
        # Milestone Stats
        'total_submissions': submissions.count(),
        'pending_evaluations': submissions.filter(status='submitted').count(),
        'evaluated_submissions': submissions.filter(status='evaluated').count(),
        
        # Calendar Stats
        'upcoming_milestones': CalendarEvent.objects.filter(
            event_type='MILESTONE',
            start_date__gte=timezone.now(),
            start_date__lte=timezone.now() + timedelta(days=7)
        ).count(),
        
        'overdue_milestones': CalendarEvent.objects.filter(
            event_type='MILESTONE',
            start_date__lt=timezone.now()
        ).count(),
        
        'topic_deadlines': CalendarEvent.objects.filter(
            event_type='TOPIC_DEADLINE',
            start_date__gte=timezone.now()
        ).count(),
        
        # Performance Stats
        'average_evaluation_score': MilestoneEvaluation.objects.filter(
            submission__student=user if user.role == 'student' else None
        ).aggregate(avg_score=Avg('marks_obtained'))['avg_score'] or 0,
        
        # Recent Activity
        'recent_activities_count': activities.filter(
            created_at__gte=timezone.now() - timedelta(days=7)
        ).count(),
    }
    
    # Add role-specific stats
    if user.role == 'student':
        stats['my_projects_completion'] = calculate_student_progress(user)
    elif user.role == 'guide' or user.role == 'faculty':
        stats['students_guided'] = topics.values('student').distinct().count()
        stats['pending_reviews'] = topics.filter(status='submitted').count()
    elif user.role == 'coordinator':
        stats['total_students_enrolled'] = activities.aggregate(
            total=Count('assigned_students', distinct=True)
        )['total'] or 0
    
    return Response(stats)

def calculate_student_progress(student):
    """Calculate overall progress for a student across all projects"""
    topics = TopicSubmission.objects.filter(student=student, status='approved')
    if not topics.exists():
        return 0
    
    total_progress = 0
    project_count = 0
    
    for topic in topics:
        activity = topic.activity
        milestones = ProjectMilestone.objects.filter(project_activity=activity)
        if milestones.exists():
            completed_milestones = MilestoneSubmission.objects.filter(
                milestone__in=milestones,
                student=student,
                status='evaluated'
            ).count()
            
            progress = (completed_milestones / milestones.count()) * 100
            total_progress += progress
            project_count += 1
    
    return total_progress / project_count if project_count > 0 else 0

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def workflow_recent_activities(request):
    """
    Get recent workflow activities for timeline display
    """
    user = request.user
    activities = []
    
    # Recent topic submissions
    recent_topics = TopicSubmission.objects.filter(
        submitted_at__gte=timezone.now() - timedelta(days=14)
    ).order_by('-submitted_at')[:10]
    
    for topic in recent_topics:
        activities.append({
            'type': 'topic_submission',
            'title': f"Topic Submitted: {topic.topic_title}",
            'user': f"{topic.student.first_name} {topic.student.last_name}",
            'timestamp': topic.submitted_at,
            'status': topic.status,
            'details': topic.topic_description[:100] + "..." if len(topic.topic_description) > 100 else topic.topic_description
        })
    
    # Recent milestone submissions
    recent_submissions = MilestoneSubmission.objects.filter(
        submitted_at__gte=timezone.now() - timedelta(days=14)
    ).order_by('-submitted_at')[:10]
    
    for submission in recent_submissions:
        activities.append({
            'type': 'milestone_submission',
            'title': f"Milestone Submitted: {submission.milestone.title}",
            'user': f"{submission.student.first_name} {submission.student.last_name}",
            'timestamp': submission.submitted_at,
            'status': submission.status,
            'details': submission.submission_text[:100] + "..." if len(submission.submission_text) > 100 else submission.submission_text
        })
    
    # Recent evaluations
    recent_evaluations = MilestoneEvaluation.objects.filter(
        evaluated_at__gte=timezone.now() - timedelta(days=14)
    ).order_by('-evaluated_at')[:10]
    
    for evaluation in recent_evaluations:
        activities.append({
            'type': 'evaluation',
            'title': f"Milestone Evaluated: {evaluation.submission.milestone.title}",
            'user': f"{evaluation.evaluator.first_name} {evaluation.evaluator.last_name}",
            'timestamp': evaluation.evaluated_at,
            'status': evaluation.status,
            'details': f"Score: {evaluation.marks_obtained}/{evaluation.max_marks}"
        })
    
    # Sort by timestamp
    activities.sort(key=lambda x: x['timestamp'], reverse=True)
    
    return Response(activities[:20])  # Return top 20 recent activities

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def workflow_progress_analytics(request):
    """
    Get workflow progress analytics for charts and graphs
    """
    user = request.user
    
    # Progress over time data
    monthly_data = []
    for i in range(6):  # Last 6 months
        start_date = timezone.now() - timedelta(days=30 * (i + 1))
        end_date = timezone.now() - timedelta(days=30 * i)
        
        month_stats = {
            'month': start_date.strftime('%b %Y'),
            'activities_created': ProjectActivity.objects.filter(
                created_at__range=[start_date, end_date]
            ).count(),
            'topics_submitted': TopicSubmission.objects.filter(
                submitted_at__range=[start_date, end_date]
            ).count(),
            'milestones_completed': MilestoneSubmission.objects.filter(
                submitted_at__range=[start_date, end_date],
                status='evaluated'
            ).count()
        }
        monthly_data.append(month_stats)
    
    # Status distribution
    status_distribution = {
        'topics': {
            'submitted': TopicSubmission.objects.filter(status='submitted').count(),
            'approved': TopicSubmission.objects.filter(status='approved').count(),
            'rejected': TopicSubmission.objects.filter(status='rejected').count(),
            'under_review': TopicSubmission.objects.filter(status='under_review').count(),
        },
        'milestones': {
            'pending': MilestoneSubmission.objects.filter(status='submitted').count(),
            'evaluated': MilestoneSubmission.objects.filter(status='evaluated').count(),
            'late': MilestoneSubmission.objects.filter(status='late').count(),
        }
    }
    
    # Performance metrics
    performance_metrics = {
        'average_topic_approval_time': calculate_average_approval_time(),
        'average_evaluation_score': MilestoneEvaluation.objects.aggregate(
            avg_score=Avg('marks_obtained')
        )['avg_score'] or 0,
        'completion_rate': calculate_completion_rate(),
    }
    
    return Response({
        'monthly_data': monthly_data,
        'status_distribution': status_distribution,
        'performance_metrics': performance_metrics
    })

def calculate_average_approval_time():
    """Calculate average time taken for topic approvals"""
    approved_topics = TopicSubmission.objects.filter(
        status='approved',
        reviewed_at__isnull=False
    )
    
    if not approved_topics.exists():
        return 0
    
    total_hours = 0
    for topic in approved_topics:
        time_diff = topic.reviewed_at - topic.submitted_at
        total_hours += time_diff.total_seconds() / 3600
    
    return total_hours / approved_topics.count()

def calculate_completion_rate():
    """Calculate overall project completion rate"""
    total_activities = ProjectActivity.objects.filter(status__in=['active', 'completed']).count()
    completed_activities = ProjectActivity.objects.filter(status='completed').count()
    
    if total_activities == 0:
        return 0
    
    return (completed_activities / total_activities) * 100
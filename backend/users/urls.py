from django.urls import path, include
from .views import (
    UserDetailsView, 
    CustomTokenObtainPairView,
    StudentViewSet,
    guide_students,
    all_users_for_notifications
)
from .faculty_views import FacultyViewSet
from .calendar_views import CalendarEventViewSet, NotificationViewSet
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework.routers import DefaultRouter

# Create router for ViewSets
router = DefaultRouter()
router.register(r'students', StudentViewSet, basename='student')
router.register(r'faculty', FacultyViewSet, basename='faculty')
router.register(r'calendar', CalendarEventViewSet, basename='calendar')
router.register(r'notifications', NotificationViewSet, basename='notifications')

urlpatterns = [
    # Auth endpoints
    path('auth/login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/user/', UserDetailsView.as_view(), name='user-details'),
    
    # Faculty and student endpoints
    path('guide-students/', guide_students, name='guide-students'),
    path('all-users/', all_users_for_notifications, name='all-users'),
    path('', include(router.urls)),  # This will include faculty/ and students/ endpoints
]

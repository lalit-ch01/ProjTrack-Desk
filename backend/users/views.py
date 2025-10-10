# users/views.py

from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from .permissions import IsAdmin, IsCoordinator, IsAdminOrCoordinator, CanManageStudents
from rest_framework.response import Response
from rest_framework import generics, viewsets, status
from django.contrib.auth import get_user_model
from .serializers import (
    UserSerializer, 
    CustomTokenObtainPairSerializer,
    StudentCreateSerializer
)
from rest_framework.views import APIView
from .models import CustomUser

from rest_framework_simplejwt.views import TokenObtainPairView

# ✅ Custom Login View with role in response
class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            user = CustomUser.objects.get(username=request.data['username'])
            # Force update role for admin users
            if user.is_superuser:
                user.role = 'admin'
                user.save()
            response.data['role'] = user.role
        return response


# ✅ Admin Register View (to create new users)
class RegisterView(generics.CreateAPIView):
    queryset = CustomUser.objects.all()
    serializer_class = UserSerializer


# Import permissions from permissions.py
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
            
        if request.user.role in ['admin', 'coordinator']:
            return True
            
        if request.user.role == 'guide':
            # Guides can only view
            if request.method in ['GET', 'HEAD', 'OPTIONS']:
                return True
            return False
            
        return False

# Faculty list view (accessible by admin and coordinator)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def faculty_list(request):
    if not (request.user.is_superuser or request.user.role == 'coordinator'):
        return Response({'error': 'Not authorized'}, status=403)
    
    faculties = CustomUser.objects.filter(role__in=['guide', 'coordinator'])
    serializer = UserSerializer(faculties, many=True)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def all_users_for_notifications(request):
    # Only allow users who can send notifications to see all users
    if request.user.role not in ['admin', 'coordinator', 'guide']:
        return Response({'error': 'Not authorized'}, status=403)
    
    # Get all users including admin users
    users = CustomUser.objects.all()
    serializer = UserSerializer(users, many=True)
    return Response(serializer.data)

# Student management views for coordinators
class StudentViewSet(viewsets.ModelViewSet):
    serializer_class = StudentCreateSerializer
    
    def get_permissions(self):
        if self.action == 'list':
            return [IsAuthenticated()]  # Allow listing for notification purposes
        return [CanManageStudents()]

    def get_queryset(self):
        queryset = CustomUser.objects.filter(role='student')
        if self.request.user.role == 'guide':
            # Guide can only see their assigned students
            return queryset.filter(guide=self.request.user)
        return queryset

    @action(detail=False, methods=['post'])
    def assign_guide(self, request):
        if request.user.role not in ['admin', 'coordinator']:
            return Response(
                {'error': 'Only admin and coordinator can assign guides'},
                status=status.HTTP_403_FORBIDDEN
            )

        guide_id = request.data.get('guide_id')
        student_ids = request.data.get('student_ids', [])

        if not guide_id or not student_ids:
            return Response(
                {'error': 'Both guide_id and student_ids are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            guide = CustomUser.objects.get(id=guide_id, role='guide')
            
            # First check if any selected students already have guides
            existing_guides = CustomUser.objects.filter(
                id__in=student_ids,
                role='student',
                guide__isnull=False
            ).exists()
            
            if existing_guides:
                return Response(
                    {'error': 'Some selected students already have guides assigned'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get only unassigned students
            students = CustomUser.objects.filter(
                id__in=student_ids,
                role='student',
                guide__isnull=True
            )
            
            if not students:
                return Response(
                    {'error': 'No unassigned students found among the selected ones'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Update each student's guide
            updated_students = []
            for student in students:
                student.guide = guide
                student.save()
                # Re-fetch to ensure we have the latest data
                student.refresh_from_db()
                serializer = self.get_serializer(student)
                updated_students.append(serializer.data)

            success_message = f'{len(updated_students)} students assigned to {guide.get_full_name() or guide.username}'
            return Response({
                'message': success_message,
                'updated_students': updated_students
            })

        except CustomUser.DoesNotExist:
            return Response(
                {'error': 'Guide not found or not a valid guide'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def change_guide(self, request, pk=None):
        if request.user.role not in ['admin', 'coordinator']:
            return Response(
                {'error': 'Only admin and coordinator can change guides'},
                status=status.HTTP_403_FORBIDDEN
            )

        student = self.get_object()
        guide_id = request.data.get('guide_id')  # Can be None to remove guide
        print(f"Changing guide for student {student.id} to guide_id {guide_id}")

        try:
            if guide_id:
                guide = CustomUser.objects.get(id=guide_id, role='guide')
                student.guide = guide
                student.save()
                print(f"Updated student {student.id} with guide {guide.id}")
                # Verify the update
                updated_student = CustomUser.objects.get(id=student.id)
                print(f"Verification - Student's guide after save: {updated_student.guide_id}")
                message = f'Guide changed to {guide.get_full_name() or guide.username}'
            else:
                student.guide = None
                student.save()
                print(f"Removed guide from student {student.id}")
                # Verify the update
                updated_student = CustomUser.objects.get(id=student.id)
                print(f"Verification - Student's guide after removal: {updated_student.guide_id}")
                message = 'Guide removed successfully'

            # Re-fetch the student to get the latest data
            student = CustomUser.objects.get(id=student.id)
            serializer = self.get_serializer(student)
            print(f"Final serialized data: {serializer.data}")

            return Response({
                'message': message,
                'student': serializer.data
            })

        except CustomUser.DoesNotExist:
            return Response(
                {'error': 'Guide not found or not a valid guide'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    def perform_create(self, serializer):
        serializer.save()
        # Send email notification about account creation (implement this later)
        # send_account_creation_email(serializer.instance)

# List students for guides
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def guide_students(request):
    if request.user.role not in ['guide', 'coordinator']:
        return Response({'error': 'Not authorized'}, status=403)
    
    students = CustomUser.objects.filter(role='student')
    serializer = UserSerializer(students, many=True)
    return Response(serializer.data)


# Get current user details
class UserDetailsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

# ✅ Update user role – Admin only
@api_view(['PUT'])
@permission_classes([IsAdminUser])
def update_user_role(request, user_id):
    try:
        user = CustomUser.objects.get(id=user_id)
        new_role = request.data.get('role')

        if new_role in ['guide', 'coordinator']:
            user.role = new_role
            user.save()
            return Response({'message': f'Role updated to {new_role}'})

        return Response({'error': 'Invalid role'}, status=400)

    except CustomUser.DoesNotExist:
        return Response({'error': 'User not found'}, status=404)

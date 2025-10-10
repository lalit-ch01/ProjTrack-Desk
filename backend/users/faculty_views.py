# users/faculty_views.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import CustomUser
from .serializers import UserSerializer
from .permissions import IsAdmin, IsAdminOrCoordinator
from django.db.models import Q

class FacultyViewSet(viewsets.ModelViewSet):
    serializer_class = UserSerializer
    permission_classes = [IsAdminOrCoordinator]

    def get_queryset(self):
        return CustomUser.objects.filter(
            Q(role='guide') | Q(role='coordinator') | Q(role='admin')
        )

    def get_permissions(self):
        if self.action == 'list':
            return [IsAuthenticated()]
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'promote_to_coordinator']:
            return [IsAdmin()]
        return [IsAdminOrCoordinator()]

    def perform_create(self, serializer):
        # Set role to guide by default for new faculty
        serializer.save(role='guide')

    @action(detail=True, methods=['put'])
    def promote_to_coordinator(self, request, pk=None):
        faculty = self.get_object()
        if faculty.role == 'coordinator':
            return Response(
                {'error': 'Faculty is already a coordinator'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if there's already a coordinator
        existing_coordinator = CustomUser.objects.filter(role='coordinator').first()
        if existing_coordinator:
            return Response(
                {'error': f'A coordinator already exists: {existing_coordinator.get_full_name() or existing_coordinator.username}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        faculty.role = 'coordinator'
        faculty.save()
        serializer = self.get_serializer(faculty)
        return Response(serializer.data)

    @action(detail=True, methods=['put'])
    def demote_from_coordinator(self, request, pk=None):
        faculty = self.get_object()
        if faculty.role != 'coordinator':
            return Response(
                {'error': 'Faculty is not a coordinator'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        faculty.role = 'guide'
        faculty.save()
        serializer = self.get_serializer(faculty)
        return Response(serializer.data)
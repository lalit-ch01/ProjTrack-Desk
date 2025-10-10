# users/serializers.py

from rest_framework import serializers
from .models import CustomUser
from django.contrib.auth.password_validation import validate_password
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password],
        style={'input_type': 'password'}
    )

    guide_name = serializers.CharField(read_only=True)
    profile_image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = CustomUser
        fields = ('id', 'username', 'email', 'password', 'role', 'first_name', 'last_name',
                 'registration_number', 'department', 'guide', 'guide_name', 'profile_image', 
                 'profile_image_url', 'description')
        extra_kwargs = {
            'username': {
                'error_messages': {
                    'required': 'Username is required',
                    'blank': 'Username cannot be blank'
                }
            },
            'email': {
                'error_messages': {
                    'required': 'Email is required',
                    'invalid': 'Please enter a valid email address'
                }
            },
            'password': {
                'write_only': True,
                'style': {'input_type': 'password'},
                'error_messages': {
                    'required': 'Password is required'
                }
            }
        }

    def get_profile_image_url(self, obj):
        if obj.profile_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.profile_image.url)
        return None

    def validate_username(self, value):
        if len(value) < 3:
            raise serializers.ValidationError("Username must be at least 3 characters long")
        
        # Check for username uniqueness during creation
        if not self.instance and CustomUser.objects.filter(username=value).exists():
            raise serializers.ValidationError("This username is already taken")
        
        return value

    def validate_email(self, value):
        # Check for email uniqueness during creation
        if not self.instance and CustomUser.objects.filter(email=value).exists():
            raise serializers.ValidationError("This email address is already taken")
        
        return value

    def validate_registration_number(self, value):
        # Only validate if registration number is provided and not empty
        if value and value.strip():
            # Check for registration number uniqueness during creation
            if not self.instance and CustomUser.objects.filter(registration_number=value).exists():
                raise serializers.ValidationError("This registration number is already taken")
        
        return value

    def create(self, validated_data):
        try:
            role = self.context.get('role', 'guide')  # Default to guide for faculty
            user = CustomUser.objects.create_user(
                username=validated_data['username'],
                email=validated_data['email'],
                password=validated_data['password'],
                first_name=validated_data.get('first_name', ''),
                last_name=validated_data.get('last_name', ''),
                registration_number=validated_data.get('registration_number', ''),
                department=validated_data.get('department', ''),
                role=role
            )
            return user
        except Exception as e:
            raise serializers.ValidationError(str(e))

class StudentCreateSerializer(UserSerializer):
    guide_name = serializers.SerializerMethodField()
    
    class Meta(UserSerializer.Meta):
        fields = ('id', 'username', 'email', 'password', 'first_name', 'last_name',
                 'registration_number', 'department', 'guide', 'guide_name')

    def get_guide_name(self, obj):
        if obj.guide:
            return f"{obj.guide.first_name} {obj.guide.last_name}".strip() or obj.guide.username
        return None

    def create(self, validated_data):
        # Force role to be student
        self.context['role'] = 'student'
        return super().create(validated_data)

    def update(self, instance, validated_data):
        instance = super().update(instance, validated_data)
        # Ensure guide changes are saved
        if 'guide' in validated_data:
            instance.guide = validated_data['guide']
            instance.save()
        return instance

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        
        # Force admin role for superusers
        if self.user.is_superuser:
            self.user.role = 'admin'
            self.user.save()
        
        # Add more user data to the token response
        data.update({
            'id': self.user.id,
            'username': self.user.username,
            'email': self.user.email,
            'role': self.user.role,  # This will now be 'admin' for superusers
            'is_superuser': self.user.is_superuser,
            'is_staff': self.user.is_staff
        })
        return data

class ProfileUpdateSerializer(serializers.ModelSerializer):
    profile_image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = CustomUser
        fields = ('username', 'profile_image', 'profile_image_url', 'description')
        
    def get_profile_image_url(self, obj):
        if obj.profile_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.profile_image.url)
        return None

    def validate_username(self, value):
        if len(value) < 3:
            raise serializers.ValidationError("Username must be at least 3 characters long")
        
        # Check if username is taken by another user
        user = self.instance
        if CustomUser.objects.filter(username=value).exclude(id=user.id).exists():
            raise serializers.ValidationError("This username is already taken")
        
        return value

    def validate_description(self, value):
        if value and len(value) > 500:
            raise serializers.ValidationError("Description cannot exceed 500 characters")
        return value

class AdminUserEditSerializer(serializers.ModelSerializer):
    """Admin-only serializer for editing sensitive user details"""
    guide_name = serializers.SerializerMethodField()
    profile_image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = CustomUser
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 
                 'registration_number', 'department', 'role', 'guide', 'guide_name',
                 'profile_image', 'profile_image_url', 'description')
        
    def get_guide_name(self, obj):
        if obj.guide:
            return f"{obj.guide.first_name} {obj.guide.last_name}".strip() or obj.guide.username
        return None
        
    def get_profile_image_url(self, obj):
        if obj.profile_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.profile_image.url)
        return None

    def validate_username(self, value):
        if len(value) < 3:
            raise serializers.ValidationError("Username must be at least 3 characters long")
        
        # Check if username is taken by another user
        user = self.instance
        if user and CustomUser.objects.filter(username=value).exclude(id=user.id).exists():
            raise serializers.ValidationError("This username is already taken")
        
        return value

    def validate_email(self, value):
        # Check if email is taken by another user
        user = self.instance
        if user and CustomUser.objects.filter(email=value).exclude(id=user.id).exists():
            raise serializers.ValidationError("This email is already taken")
        
        return value

    def validate_registration_number(self, value):
        # Only validate if registration number is provided and not empty
        if value and value.strip():
            # Check if registration number is taken by another user
            user = self.instance
            if user and CustomUser.objects.filter(registration_number=value).exclude(id=user.id).exists():
                raise serializers.ValidationError("This registration number is already taken")
        
        return value

    def validate_description(self, value):
        if value and len(value) > 500:
            raise serializers.ValidationError("Description cannot exceed 500 characters")
        return value

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
    
    class Meta:
        model = CustomUser
        fields = ('id', 'username', 'email', 'password', 'role', 'first_name', 'last_name',
                 'registration_number', 'department', 'guide', 'guide_name')
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

    def validate_username(self, value):
        if len(value) < 3:
            raise serializers.ValidationError("Username must be at least 3 characters long")
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

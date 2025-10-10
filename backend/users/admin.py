from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser
from django.contrib.auth.models import Group

class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'role', 'is_active', 'date_joined')
    list_filter = ('role', 'is_active')
    search_fields = ('username', 'email', 'first_name', 'last_name')
    ordering = ('username',)
    
    def get_form(self, request, obj=None, **kwargs):
        form = super().get_form(request, obj, **kwargs)
        if obj is None:  # Only when creating new user
            form.base_fields['role'].initial = 'guide'  # Default role for faculty
        return form

    # Fields to show in the edit form
    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        ('Personal info', {'fields': ('first_name', 'last_name', 'email')}),
        ('Roles and Permissions', {
            'fields': ('role', 'is_active', 'is_staff', 'is_superuser'),
            'description': 'Set the role and permissions for this user. Only administrators can modify these settings.'
        }),
    )

    # Fields to show when creating a new user
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'email', 'password1', 'password2', 'role', 'is_active'),
        }),
    )

    def get_readonly_fields(self, request, obj=None):
        # If the user is not a superuser, make role field readonly
        if not request.user.is_superuser:
            return ('role',) + super().get_readonly_fields(request, obj)
        return super().get_readonly_fields(request, obj)

    def save_model(self, request, obj, form, change):
        # Ensure only superusers can create admin users
        if obj.is_superuser and not request.user.is_superuser:
            return
        super().save_model(request, obj, form, change)

# Register the custom user admin
admin.site.register(CustomUser, CustomUserAdmin)

# Unregister the Group model since we're not using it
admin.site.unregister(Group)

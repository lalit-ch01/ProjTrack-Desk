from django.contrib import admin
from django.urls import path, re_path, include
from django.http import HttpResponseRedirect

urlpatterns = [
    path('admin/', admin.site.urls),
    # All authentication and user management endpoints
    path('api/', include('users.urls')),
    # Redirect root to frontend login
    re_path(r'^$', lambda request: HttpResponseRedirect('http://localhost:5173/login')),
]

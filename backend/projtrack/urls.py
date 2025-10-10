from django.contrib import admin
from django.urls import path, re_path, include
from django.http import HttpResponseRedirect
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    # All authentication and user management endpoints
    path('api/', include('users.urls')),
    # Redirect root to frontend login
    re_path(r'^$', lambda request: HttpResponseRedirect('http://localhost:5173/login')),
]

# Serve media files during development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

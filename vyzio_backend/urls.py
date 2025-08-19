from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.views.static import serve
from django.views.generic import TemplateView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("ads.urls")),
]

# ✅ Static & Media handling
if settings.DEBUG:
    # Development: serve static & media files
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
else:
    # Production: media via Django (static should be handled by web server)
    urlpatterns += [
        re_path(r"^media/(?P<path>.*)$", serve, {"document_root": settings.MEDIA_ROOT}),
    ]

# ✅ Catch-all for React frontend (must always be LAST)
urlpatterns += [
    re_path(
        r"^(?!api/|admin/|static/|media/|favicon.ico).*",
        TemplateView.as_view(template_name="index.html"),
    ),
]

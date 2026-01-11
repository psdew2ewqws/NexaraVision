"""
URL configuration for detection app
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    DetectionEventViewSet, MonitoringCameraViewSet, DetectionLogViewSet,
    ImageDetectionView, VideoDetectionView, MonitoringStatsView
)

router = DefaultRouter()
router.register(r'events', DetectionEventViewSet, basename='detection-event')
router.register(r'cameras', MonitoringCameraViewSet, basename='monitoring-camera')
router.register(r'logs', DetectionLogViewSet, basename='detection-log')

urlpatterns = [
    path('', include(router.urls)),
    path('detect/image/', ImageDetectionView.as_view(), name='detect-image'),
    path('detect/video/', VideoDetectionView.as_view(), name='detect-video'),
    path('stats/', MonitoringStatsView.as_view(), name='monitoring-stats'),
]

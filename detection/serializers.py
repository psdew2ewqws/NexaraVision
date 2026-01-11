"""
Serializers for the detection app
"""

from rest_framework import serializers
from .models import DetectionEvent, MonitoringCamera, DetectionLog


class DetectionEventSerializer(serializers.ModelSerializer):
    """Serializer for DetectionEvent model"""
    
    class Meta:
        model = DetectionEvent
        fields = [
            'id', 'timestamp', 'source', 'image', 'video',
            'confidence_score', 'severity', 'status', 'description',
            'location', 'reviewed_at', 'reviewed_by'
        ]
        read_only_fields = ['id', 'timestamp']


class MonitoringCameraSerializer(serializers.ModelSerializer):
    """Serializer for MonitoringCamera model"""
    
    class Meta:
        model = MonitoringCamera
        fields = [
            'id', 'name', 'location', 'stream_url',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class DetectionLogSerializer(serializers.ModelSerializer):
    """Serializer for DetectionLog model"""
    camera_name = serializers.CharField(source='camera.name', read_only=True)
    
    class Meta:
        model = DetectionLog
        fields = [
            'id', 'timestamp', 'camera', 'camera_name',
            'processing_time', 'frames_analyzed', 'violence_detected',
            'error_message'
        ]
        read_only_fields = ['id', 'timestamp']


class ImageUploadSerializer(serializers.Serializer):
    """Serializer for image upload and detection"""
    image = serializers.ImageField(required=True)
    source = serializers.CharField(max_length=255, required=False, default='upload')
    location = serializers.CharField(max_length=255, required=False, allow_blank=True)


class VideoUploadSerializer(serializers.Serializer):
    """Serializer for video upload and detection"""
    video = serializers.FileField(required=True)
    source = serializers.CharField(max_length=255, required=False, default='upload')
    location = serializers.CharField(max_length=255, required=False, allow_blank=True)
    sample_rate = serializers.IntegerField(required=False, default=30, min_value=1)

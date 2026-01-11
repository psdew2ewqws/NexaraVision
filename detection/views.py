"""
Views for the detection app
"""

import time
import os
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import DetectionEvent, MonitoringCamera, DetectionLog
from .serializers import (
    DetectionEventSerializer, MonitoringCameraSerializer,
    DetectionLogSerializer, ImageUploadSerializer, VideoUploadSerializer
)
from .ai_detector import detector


class DetectionEventViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing detection events
    """
    queryset = DetectionEvent.objects.all()
    serializer_class = DetectionEventSerializer
    
    @action(detail=['GET'], methods=['get'])
    def pending(self, request):
        """Get all pending detection events"""
        pending_events = self.queryset.filter(status='pending')
        serializer = self.get_serializer(pending_events, many=True)
        return Response(serializer.data)
    
    @action(detail=['GET'], methods=['get'])
    def confirmed(self, request):
        """Get all confirmed violence events"""
        confirmed_events = self.queryset.filter(status='confirmed')
        serializer = self.get_serializer(confirmed_events, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def review(self, request, pk=None):
        """Mark an event as reviewed"""
        event = self.get_object()
        event.status = request.data.get('status', event.status)
        event.reviewed_at = timezone.now()
        event.reviewed_by = request.data.get('reviewed_by', 'system')
        event.save()
        serializer = self.get_serializer(event)
        return Response(serializer.data)


class MonitoringCameraViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing monitoring cameras
    """
    queryset = MonitoringCamera.objects.all()
    serializer_class = MonitoringCameraSerializer
    
    @action(detail=['GET'], methods=['get'])
    def active(self, request):
        """Get all active cameras"""
        active_cameras = self.queryset.filter(is_active=True)
        serializer = self.get_serializer(active_cameras, many=True)
        return Response(serializer.data)


class DetectionLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing detection logs (read-only)
    """
    queryset = DetectionLog.objects.all()
    serializer_class = DetectionLogSerializer


class ImageDetectionView(APIView):
    """
    API endpoint for detecting violence in uploaded images
    """
    
    def post(self, request):
        """
        Upload an image and detect violence
        """
        serializer = ImageUploadSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        image = serializer.validated_data['image']
        source = serializer.validated_data.get('source', 'upload')
        location = serializer.validated_data.get('location', '')
        
        start_time = time.time()
        
        try:
            # Read image data
            image_data = image.read()
            
            # Detect violence using AI
            result = detector.detect_violence_in_image(image_data)
            
            processing_time = time.time() - start_time
            
            # Create detection event if violence detected
            detection_event = None
            if result['violence_detected']:
                # Save the image
                detection_event = DetectionEvent.objects.create(
                    source=source,
                    image=image,
                    confidence_score=result['confidence_score'],
                    severity=result['severity'],
                    location=location,
                    description=f"Automatic detection with {result['confidence_score']:.2%} confidence"
                )
            
            # Log the detection attempt
            DetectionLog.objects.create(
                processing_time=processing_time,
                frames_analyzed=1,
                violence_detected=result['violence_detected']
            )
            
            response_data = {
                'violence_detected': result['violence_detected'],
                'confidence_score': result['confidence_score'],
                'severity': result['severity'],
                'processing_time': processing_time,
                'details': result.get('details', {}),
            }
            
            if detection_event:
                response_data['event_id'] = detection_event.id
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            # Log the error
            DetectionLog.objects.create(
                processing_time=time.time() - start_time,
                frames_analyzed=0,
                violence_detected=False,
                error_message=str(e)
            )
            
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class VideoDetectionView(APIView):
    """
    API endpoint for detecting violence in uploaded videos
    """
    
    def post(self, request):
        """
        Upload a video and detect violence
        """
        serializer = VideoUploadSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        video = serializer.validated_data['video']
        source = serializer.validated_data.get('source', 'upload')
        location = serializer.validated_data.get('location', '')
        sample_rate = serializer.validated_data.get('sample_rate', 30)
        
        start_time = time.time()
        
        try:
            # Save video temporarily for processing
            temp_path = f'/tmp/video_{int(time.time())}.mp4'
            with open(temp_path, 'wb+') as destination:
                for chunk in video.chunks():
                    destination.write(chunk)
            
            # Detect violence using AI
            result = detector.detect_violence_in_video(temp_path, sample_rate=sample_rate)
            
            processing_time = time.time() - start_time
            
            # Create detection event if violence detected
            detection_event = None
            if result.get('violence_detected', False):
                detection_event = DetectionEvent.objects.create(
                    source=source,
                    video=video,
                    confidence_score=result['confidence_score'],
                    severity=result['severity'],
                    location=location,
                    description=f"Automatic detection in video: {result['violence_frame_count']} violent frames detected"
                )
            
            # Log the detection attempt
            DetectionLog.objects.create(
                processing_time=processing_time,
                frames_analyzed=result.get('analyzed_frames', 0),
                violence_detected=result.get('violence_detected', False),
                error_message=result.get('error', '')
            )
            
            # Clean up temporary file
            if os.path.exists(temp_path):
                os.remove(temp_path)
            
            response_data = {
                'violence_detected': result.get('violence_detected', False),
                'confidence_score': result.get('confidence_score', 0.0),
                'severity': result.get('severity', 'low'),
                'processing_time': processing_time,
                'total_frames': result.get('total_frames', 0),
                'analyzed_frames': result.get('analyzed_frames', 0),
                'violence_frames': result.get('violence_frames', []),
            }
            
            if detection_event:
                response_data['event_id'] = detection_event.id
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            # Clean up temporary file on error
            if 'temp_path' in locals() and os.path.exists(temp_path):
                os.remove(temp_path)
            
            # Log the error
            DetectionLog.objects.create(
                processing_time=time.time() - start_time,
                frames_analyzed=0,
                violence_detected=False,
                error_message=str(e)
            )
            
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class MonitoringStatsView(APIView):
    """
    API endpoint for monitoring statistics
    """
    
    def get(self, request):
        """
        Get monitoring statistics
        """
        stats = {
            'total_events': DetectionEvent.objects.count(),
            'pending_events': DetectionEvent.objects.filter(status='pending').count(),
            'confirmed_events': DetectionEvent.objects.filter(status='confirmed').count(),
            'false_positives': DetectionEvent.objects.filter(status='false_positive').count(),
            'active_cameras': MonitoringCamera.objects.filter(is_active=True).count(),
            'total_cameras': MonitoringCamera.objects.count(),
            'total_logs': DetectionLog.objects.count(),
        }
        
        # Get recent events by severity
        severity_counts = {}
        for severity_choice in DetectionEvent.SEVERITY_CHOICES:
            severity = severity_choice[0]
            count = DetectionEvent.objects.filter(severity=severity).count()
            severity_counts[severity] = count
        
        stats['severity_breakdown'] = severity_counts
        
        return Response(stats, status=status.HTTP_200_OK)


"""
Tests for the detection app
"""

from django.test import TestCase
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APITestCase
from rest_framework import status
from .models import DetectionEvent, MonitoringCamera, DetectionLog
from .ai_detector import ViolenceDetector
import io
from PIL import Image


class DetectionEventModelTest(TestCase):
    """Tests for DetectionEvent model"""
    
    def setUp(self):
        self.event = DetectionEvent.objects.create(
            source='test_camera',
            confidence_score=0.85,
            severity='high',
            location='Test Location'
        )
    
    def test_detection_event_creation(self):
        """Test that detection event is created correctly"""
        self.assertEqual(self.event.source, 'test_camera')
        self.assertEqual(self.event.confidence_score, 0.85)
        self.assertEqual(self.event.severity, 'high')
        self.assertEqual(self.event.status, 'pending')
    
    def test_detection_event_str(self):
        """Test string representation"""
        self.assertIn('Detection', str(self.event))
        self.assertIn('test_camera', str(self.event))


class MonitoringCameraModelTest(TestCase):
    """Tests for MonitoringCamera model"""
    
    def setUp(self):
        self.camera = MonitoringCamera.objects.create(
            name='Test Camera 1',
            location='Building A',
            is_active=True
        )
    
    def test_camera_creation(self):
        """Test that camera is created correctly"""
        self.assertEqual(self.camera.name, 'Test Camera 1')
        self.assertEqual(self.camera.location, 'Building A')
        self.assertTrue(self.camera.is_active)
    
    def test_camera_str(self):
        """Test string representation"""
        self.assertIn('Test Camera 1', str(self.camera))


class DetectionLogModelTest(TestCase):
    """Tests for DetectionLog model"""
    
    def test_log_creation(self):
        """Test that detection log is created correctly"""
        log = DetectionLog.objects.create(
            processing_time=1.5,
            frames_analyzed=10,
            violence_detected=True
        )
        self.assertEqual(log.processing_time, 1.5)
        self.assertEqual(log.frames_analyzed, 10)
        self.assertTrue(log.violence_detected)


class ViolenceDetectorTest(TestCase):
    """Tests for ViolenceDetector AI module"""
    
    def setUp(self):
        self.detector = ViolenceDetector()
    
    def test_detector_initialization(self):
        """Test detector initializes correctly"""
        self.assertIsNotNone(self.detector)
        self.assertEqual(self.detector.confidence_threshold, 0.5)
    
    def test_set_confidence_threshold(self):
        """Test setting confidence threshold"""
        self.detector.set_confidence_threshold(0.7)
        self.assertEqual(self.detector.confidence_threshold, 0.7)
    
    def test_invalid_threshold_raises_error(self):
        """Test that invalid threshold raises ValueError"""
        with self.assertRaises(ValueError):
            self.detector.set_confidence_threshold(1.5)
    
    def test_detect_violence_in_image(self):
        """Test violence detection in image"""
        # Create a simple test image
        img = Image.new('RGB', (100, 100), color='red')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='JPEG')
        img_bytes = img_bytes.getvalue()
        
        result = self.detector.detect_violence_in_image(img_bytes)
        
        self.assertIn('violence_detected', result)
        self.assertIn('confidence_score', result)
        self.assertIn('severity', result)
        self.assertIsInstance(result['violence_detected'], bool)
        self.assertIsInstance(result['confidence_score'], float)
        self.assertIn(result['severity'], ['low', 'medium', 'high', 'critical'])


class APIEndpointTest(APITestCase):
    """Tests for API endpoints"""
    
    def test_stats_endpoint(self):
        """Test stats endpoint returns correct data"""
        response = self.client.get('/api/stats/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total_events', response.data)
        self.assertIn('active_cameras', response.data)
        self.assertIn('severity_breakdown', response.data)
    
    def test_detection_events_list(self):
        """Test listing detection events"""
        response = self.client.get('/api/events/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_cameras_list(self):
        """Test listing cameras"""
        response = self.client.get('/api/cameras/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_logs_list(self):
        """Test listing detection logs"""
        response = self.client.get('/api/logs/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_create_camera(self):
        """Test creating a new camera"""
        data = {
            'name': 'New Camera',
            'location': 'Test Location',
            'is_active': True
        }
        response = self.client.post('/api/cameras/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(MonitoringCamera.objects.count(), 1)
    
    def test_image_detection_endpoint(self):
        """Test image detection endpoint"""
        # Create a simple test image
        img = Image.new('RGB', (100, 100), color='blue')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='JPEG')
        img_bytes.seek(0)
        
        image_file = SimpleUploadedFile(
            "test_image.jpg",
            img_bytes.read(),
            content_type="image/jpeg"
        )
        
        data = {
            'image': image_file,
            'source': 'test_upload'
        }
        
        response = self.client.post('/api/detect/image/', data, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('violence_detected', response.data)
        self.assertIn('confidence_score', response.data)
        self.assertIn('severity', response.data)


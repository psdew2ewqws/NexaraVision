from django.db import models
from django.utils import timezone


class DetectionEvent(models.Model):
    """Model to store violence detection events"""
    STATUS_CHOICES = [
        ('pending', 'Pending Review'),
        ('confirmed', 'Confirmed Violence'),
        ('false_positive', 'False Positive'),
    ]
    
    SEVERITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]
    
    timestamp = models.DateTimeField(default=timezone.now)
    source = models.CharField(max_length=255, help_text="Source camera or video identifier")
    image = models.ImageField(upload_to='detections/', null=True, blank=True)
    video = models.FileField(upload_to='detections/videos/', null=True, blank=True)
    confidence_score = models.FloatField(help_text="AI confidence score (0-1)")
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default='medium')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    description = models.TextField(blank=True, help_text="Additional details about the detection")
    location = models.CharField(max_length=255, blank=True, help_text="Physical location where violence was detected")
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.CharField(max_length=255, blank=True)
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['-timestamp']),
            models.Index(fields=['status']),
            models.Index(fields=['severity']),
        ]
    
    def __str__(self):
        return f"Detection {self.id} - {self.source} at {self.timestamp}"


class MonitoringCamera(models.Model):
    """Model to represent monitoring cameras/sources"""
    name = models.CharField(max_length=255, unique=True)
    location = models.CharField(max_length=255)
    stream_url = models.URLField(blank=True, help_text="URL for video stream")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['name']
    
    def __str__(self):
        return f"{self.name} - {self.location}"


class DetectionLog(models.Model):
    """Model to log all detection attempts for auditing"""
    timestamp = models.DateTimeField(default=timezone.now)
    camera = models.ForeignKey(MonitoringCamera, on_delete=models.SET_NULL, null=True, blank=True)
    processing_time = models.FloatField(help_text="Time taken to process in seconds")
    frames_analyzed = models.IntegerField(default=0)
    violence_detected = models.BooleanField(default=False)
    error_message = models.TextField(blank=True)
    
    class Meta:
        ordering = ['-timestamp']
    
    def __str__(self):
        return f"Log {self.id} at {self.timestamp}"


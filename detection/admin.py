from django.contrib import admin
from .models import DetectionEvent, MonitoringCamera, DetectionLog


@admin.register(DetectionEvent)
class DetectionEventAdmin(admin.ModelAdmin):
    list_display = ['id', 'timestamp', 'source', 'confidence_score', 'severity', 'status', 'location']
    list_filter = ['status', 'severity', 'timestamp']
    search_fields = ['source', 'location', 'description']
    readonly_fields = ['timestamp']
    date_hierarchy = 'timestamp'
    
    fieldsets = (
        ('Detection Information', {
            'fields': ('timestamp', 'source', 'location', 'confidence_score', 'severity')
        }),
        ('Media', {
            'fields': ('image', 'video')
        }),
        ('Review', {
            'fields': ('status', 'description', 'reviewed_at', 'reviewed_by')
        }),
    )


@admin.register(MonitoringCamera)
class MonitoringCameraAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'location', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'location']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(DetectionLog)
class DetectionLogAdmin(admin.ModelAdmin):
    list_display = ['id', 'timestamp', 'camera', 'processing_time', 'frames_analyzed', 'violence_detected']
    list_filter = ['violence_detected', 'timestamp']
    search_fields = ['error_message']
    readonly_fields = ['timestamp']
    date_hierarchy = 'timestamp'


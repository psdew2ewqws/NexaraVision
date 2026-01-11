# Nexara Django - AI Violence Detection Monitoring Service

Nexara Django is a comprehensive monitoring service that uses artificial intelligence to detect violence in images and videos. The system provides real-time analysis capabilities and a robust API for integration with various monitoring sources.

## Features

- **AI-Powered Violence Detection**: Analyze images and videos for violent content using computer vision and machine learning
- **RESTful API**: Complete API for uploading media, managing detection events, and monitoring cameras
- **Real-time Monitoring**: Track detection events with confidence scores and severity levels
- **Camera Management**: Register and manage multiple monitoring sources/cameras
- **Detection Logging**: Comprehensive audit trail of all detection attempts
- **Admin Interface**: Django admin panel for managing events, cameras, and logs
- **Severity Classification**: Automatic classification of detected violence (low, medium, high, critical)
- **Review Workflow**: Built-in review and confirmation system for detected events

## Installation

### Prerequisites

- Python 3.8 or higher
- pip package manager

### Setup

1. Clone the repository:
```bash
git clone https://github.com/psdew2ewqws/nexaraDjango.git
cd nexaraDjango
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Run migrations:
```bash
python manage.py migrate
```

4. Create a superuser (optional, for admin access):
```bash
python manage.py createsuperuser
```

5. Run the development server:
```bash
python manage.py runserver
```

The API will be available at `http://localhost:8000/api/`

## API Endpoints

### Detection Events

- `GET /api/events/` - List all detection events
- `POST /api/events/` - Create a new detection event
- `GET /api/events/{id}/` - Get a specific detection event
- `PUT /api/events/{id}/` - Update a detection event
- `DELETE /api/events/{id}/` - Delete a detection event
- `GET /api/events/pending/` - Get all pending events
- `GET /api/events/confirmed/` - Get all confirmed violence events
- `POST /api/events/{id}/review/` - Review and update event status

### Monitoring Cameras

- `GET /api/cameras/` - List all cameras
- `POST /api/cameras/` - Register a new camera
- `GET /api/cameras/{id}/` - Get camera details
- `PUT /api/cameras/{id}/` - Update camera information
- `DELETE /api/cameras/{id}/` - Remove a camera
- `GET /api/cameras/active/` - Get all active cameras

### Detection Logs

- `GET /api/logs/` - List all detection logs (read-only)
- `GET /api/logs/{id}/` - Get specific log details

### Violence Detection

- `POST /api/detect/image/` - Upload and analyze an image for violence
  - Parameters: `image` (file), `source` (string, optional), `location` (string, optional)
  
- `POST /api/detect/video/` - Upload and analyze a video for violence
  - Parameters: `video` (file), `source` (string, optional), `location` (string, optional), `sample_rate` (int, optional)

### Statistics

- `GET /api/stats/` - Get monitoring statistics including event counts, severity breakdown, and camera status

## Usage Examples

### Detect Violence in an Image

```bash
curl -X POST http://localhost:8000/api/detect/image/ \
  -F "image=@/path/to/image.jpg" \
  -F "source=camera_1" \
  -F "location=Main Entrance"
```

Response:
```json
{
  "violence_detected": true,
  "confidence_score": 0.85,
  "severity": "high",
  "processing_time": 0.234,
  "event_id": 123,
  "details": {
    "mean_intensity": 0.45,
    "std_intensity": 0.21
  }
}
```

### Detect Violence in a Video

```bash
curl -X POST http://localhost:8000/api/detect/video/ \
  -F "video=@/path/to/video.mp4" \
  -F "source=camera_2" \
  -F "location=Parking Lot" \
  -F "sample_rate=30"
```

Response:
```json
{
  "violence_detected": true,
  "confidence_score": 0.92,
  "severity": "critical",
  "processing_time": 5.67,
  "total_frames": 300,
  "analyzed_frames": 10,
  "violence_frames": [
    {"frame_number": 30, "confidence": 0.87, "severity": "high"},
    {"frame_number": 60, "confidence": 0.92, "severity": "critical"}
  ],
  "event_id": 124
}
```

### Register a Monitoring Camera

```bash
curl -X POST http://localhost:8000/api/cameras/ \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Front Door Camera",
    "location": "Building A - Main Entrance",
    "stream_url": "rtsp://camera.example.com/stream",
    "is_active": true
  }'
```

### Get Monitoring Statistics

```bash
curl http://localhost:8000/api/stats/
```

Response:
```json
{
  "total_events": 150,
  "pending_events": 12,
  "confirmed_events": 98,
  "false_positives": 40,
  "active_cameras": 8,
  "total_cameras": 10,
  "total_logs": 1500,
  "severity_breakdown": {
    "low": 30,
    "medium": 60,
    "high": 45,
    "critical": 15
  }
}
```

## Architecture

### Models

- **DetectionEvent**: Stores detected violence events with metadata, media files, confidence scores, and review status
- **MonitoringCamera**: Represents monitoring sources (cameras, video feeds)
- **DetectionLog**: Audit trail of all detection attempts for performance monitoring

### AI Detection

The system uses computer vision and machine learning techniques to analyze visual content:

1. **Image Preprocessing**: Images are resized, normalized, and prepared for analysis
2. **Feature Extraction**: Key visual features are extracted from images/video frames
3. **Violence Classification**: AI model classifies content and provides confidence scores
4. **Severity Assessment**: Results are categorized by severity level

**Note**: The current implementation includes a placeholder AI detector. In production, this should be replaced with a trained machine learning model (PyTorch, TensorFlow, etc.) specifically trained for violence detection.

## Development

### Running Tests

```bash
python manage.py test detection
```

### Creating Migrations

```bash
python manage.py makemigrations
python manage.py migrate
```

### Access Admin Panel

1. Create a superuser: `python manage.py createsuperuser`
2. Navigate to `http://localhost:8000/admin/`
3. Log in with superuser credentials

## Configuration

Key settings can be configured in `nexara/settings.py`:

- `MEDIA_ROOT`: Directory for uploaded media files
- `REST_FRAMEWORK`: API configuration including pagination
- Database settings for production deployments

## Security Considerations

- Change `SECRET_KEY` in production
- Set `DEBUG = False` in production
- Configure `ALLOWED_HOSTS` appropriately
- Implement authentication for API endpoints in production
- Use HTTPS for production deployments
- Regularly update dependencies for security patches

## Future Enhancements

- Real-time video stream monitoring
- Integration with trained deep learning models (ResNet, YOLO, etc.)
- Webhook notifications for detected events
- Dashboard UI for monitoring and analytics
- Multi-language support
- Advanced filtering and search capabilities
- Export functionality for reports and analytics

## License

This project is provided as-is for educational and monitoring purposes.

## Support

For issues, questions, or contributions, please open an issue on GitHub.
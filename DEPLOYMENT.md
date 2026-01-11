# Production Deployment Checklist

Before deploying Nexara Django to production, ensure you complete the following steps:

## Security Settings

1. **SECRET_KEY**
   - Generate a new secret key using `python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'`
   - Store it in an environment variable
   - Update settings.py: `SECRET_KEY = os.environ.get('SECRET_KEY')`

2. **DEBUG Mode**
   - Set `DEBUG = False` in settings.py
   - Or use: `DEBUG = os.environ.get('DEBUG', 'False') == 'True'`

3. **ALLOWED_HOSTS**
   - Add your domain(s): `ALLOWED_HOSTS = ['yourdomain.com', 'www.yourdomain.com']`
   - Or use environment variable

4. **HTTPS/SSL Settings**
   ```python
   SECURE_SSL_REDIRECT = True
   SESSION_COOKIE_SECURE = True
   CSRF_COOKIE_SECURE = True
   SECURE_HSTS_SECONDS = 31536000  # 1 year
   SECURE_HSTS_INCLUDE_SUBDOMAINS = True
   SECURE_HSTS_PRELOAD = True
   ```

## Database

1. **Use Production Database**
   - Replace SQLite with PostgreSQL, MySQL, or another production database
   - Configure database credentials via environment variables
   ```python
   DATABASES = {
       'default': {
           'ENGINE': 'django.db.backends.postgresql',
           'NAME': os.environ.get('DB_NAME'),
           'USER': os.environ.get('DB_USER'),
           'PASSWORD': os.environ.get('DB_PASSWORD'),
           'HOST': os.environ.get('DB_HOST'),
           'PORT': os.environ.get('DB_PORT', '5432'),
       }
   }
   ```

2. **Run Migrations**
   ```bash
   python manage.py migrate
   ```

## Static and Media Files

1. **Collect Static Files**
   ```bash
   python manage.py collectstatic
   ```

2. **Configure Media Storage**
   - Use cloud storage (AWS S3, Google Cloud Storage, etc.) for production
   - Configure appropriate permissions

## AI Model

1. **Replace Placeholder Detector**
   - Train or obtain a production-ready violence detection model
   - Update `detection/ai_detector.py` to load and use the actual model
   - Test thoroughly before deployment

## Server Configuration

1. **Use Production WSGI/ASGI Server**
   - Install gunicorn: `pip install gunicorn`
   - Run with: `gunicorn nexara.wsgi:application`
   - Or use uWSGI, Daphne for async support

2. **Set Up Reverse Proxy**
   - Configure Nginx or Apache as reverse proxy
   - Handle SSL/TLS termination
   - Serve static files

## Monitoring and Logging

1. **Configure Logging**
   - Set up proper logging in settings.py
   - Use services like Sentry for error tracking

2. **Set Up Monitoring**
   - Monitor API endpoints
   - Track detection performance
   - Set up alerts for critical issues

## API Security

1. **Enable Authentication**
   - Update REST_FRAMEWORK settings to require authentication
   ```python
   REST_FRAMEWORK = {
       'DEFAULT_PERMISSION_CLASSES': [
           'rest_framework.permissions.IsAuthenticated',
       ],
   }
   ```

2. **Rate Limiting**
   - Implement rate limiting to prevent abuse
   - Use Django REST Framework throttling

## Environment Variables

Create a `.env` file (don't commit to git):
```
SECRET_KEY=your-secret-key-here
DEBUG=False
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
DB_NAME=nexara_db
DB_USER=nexara_user
DB_PASSWORD=secure-password
DB_HOST=localhost
DB_PORT=5432
```

## Deployment Steps

1. Clone repository on server
2. Set up virtual environment: `python -m venv venv`
3. Activate: `source venv/bin/activate`
4. Install dependencies: `pip install -r requirements.txt`
5. Set environment variables
6. Run migrations: `python manage.py migrate`
7. Collect static files: `python manage.py collectstatic`
8. Create superuser: `python manage.py createsuperuser`
9. Start gunicorn: `gunicorn nexara.wsgi:application --bind 0.0.0.0:8000`
10. Configure Nginx/Apache
11. Set up systemd service for auto-restart

## Testing

1. Run all tests before deployment: `python manage.py test`
2. Perform load testing
3. Test all API endpoints
4. Verify AI detection accuracy

## Backup

1. Set up automated database backups
2. Back up media files regularly
3. Have a rollback plan

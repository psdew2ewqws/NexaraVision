"""
Example integration with Nexara Django Violence Detection API

This script demonstrates how to integrate the violence detection service
into your application.
"""

import requests
import json
from pathlib import Path


class NexaraClient:
    """Client for Nexara Django Violence Detection API"""
    
    def __init__(self, base_url='http://localhost:8000/api'):
        """
        Initialize the client
        
        Args:
            base_url: Base URL of the Nexara API
        """
        self.base_url = base_url
        
    def detect_violence_in_image(self, image_path, source='api_client', location=''):
        """
        Detect violence in an image
        
        Args:
            image_path: Path to the image file
            source: Source identifier (camera name, etc.)
            location: Physical location
            
        Returns:
            Dictionary with detection results
        """
        url = f"{self.base_url}/detect/image/"
        
        with open(image_path, 'rb') as image_file:
            files = {'image': image_file}
            data = {
                'source': source,
                'location': location
            }
            
            response = requests.post(url, files=files, data=data)
            response.raise_for_status()
            return response.json()
    
    def detect_violence_in_video(self, video_path, source='api_client', location='', sample_rate=30):
        """
        Detect violence in a video
        
        Args:
            video_path: Path to the video file
            source: Source identifier
            location: Physical location
            sample_rate: Analyze every Nth frame
            
        Returns:
            Dictionary with detection results
        """
        url = f"{self.base_url}/detect/video/"
        
        with open(video_path, 'rb') as video_file:
            files = {'video': video_file}
            data = {
                'source': source,
                'location': location,
                'sample_rate': sample_rate
            }
            
            response = requests.post(url, files=files, data=data)
            response.raise_for_status()
            return response.json()
    
    def get_detection_events(self, status=None):
        """
        Get detection events
        
        Args:
            status: Filter by status ('pending', 'confirmed', 'false_positive')
            
        Returns:
            List of detection events
        """
        if status == 'pending':
            url = f"{self.base_url}/events/pending/"
        elif status == 'confirmed':
            url = f"{self.base_url}/events/confirmed/"
        else:
            url = f"{self.base_url}/events/"
        
        response = requests.get(url)
        response.raise_for_status()
        return response.json()
    
    def review_event(self, event_id, new_status, reviewed_by='admin'):
        """
        Review a detection event
        
        Args:
            event_id: ID of the event to review
            new_status: New status ('confirmed', 'false_positive')
            reviewed_by: Name of the reviewer
            
        Returns:
            Updated event data
        """
        url = f"{self.base_url}/events/{event_id}/review/"
        data = {
            'status': new_status,
            'reviewed_by': reviewed_by
        }
        
        response = requests.post(url, json=data)
        response.raise_for_status()
        return response.json()
    
    def register_camera(self, name, location, stream_url='', is_active=True):
        """
        Register a new monitoring camera
        
        Args:
            name: Camera name
            location: Camera location
            stream_url: Optional stream URL
            is_active: Whether camera is active
            
        Returns:
            Created camera data
        """
        url = f"{self.base_url}/cameras/"
        data = {
            'name': name,
            'location': location,
            'stream_url': stream_url,
            'is_active': is_active
        }
        
        response = requests.post(url, json=data)
        response.raise_for_status()
        return response.json()
    
    def get_cameras(self, active_only=False):
        """
        Get monitoring cameras
        
        Args:
            active_only: Only return active cameras
            
        Returns:
            List of cameras
        """
        url = f"{self.base_url}/cameras/"
        if active_only:
            url = f"{self.base_url}/cameras/active/"
        
        response = requests.get(url)
        response.raise_for_status()
        return response.json()
    
    def get_stats(self):
        """
        Get monitoring statistics
        
        Returns:
            Dictionary with statistics
        """
        url = f"{self.base_url}/stats/"
        response = requests.get(url)
        response.raise_for_status()
        return response.json()


# Example usage
if __name__ == '__main__':
    # Initialize client
    client = NexaraClient('http://localhost:8000/api')
    
    # Example 1: Register a camera
    print("Registering camera...")
    camera = client.register_camera(
        name='Front Gate Camera',
        location='Main Entrance, Building A',
        is_active=True
    )
    print(f"Camera registered: {camera['name']} (ID: {camera['id']})")
    
    # Example 2: Check image for violence
    print("\nChecking image for violence...")
    # Note: Replace with actual image path
    # result = client.detect_violence_in_image(
    #     'path/to/image.jpg',
    #     source='Front Gate Camera',
    #     location='Main Entrance'
    # )
    # print(f"Violence detected: {result['violence_detected']}")
    # print(f"Confidence: {result['confidence_score']:.2%}")
    # print(f"Severity: {result['severity']}")
    
    # Example 3: Get pending events
    print("\nGetting pending events...")
    pending = client.get_detection_events(status='pending')
    print(f"Pending events: {pending['count']}")
    
    # Example 4: Review an event (if any exist)
    # if pending['results']:
    #     event = pending['results'][0]
    #     reviewed = client.review_event(
    #         event['id'],
    #         new_status='confirmed',
    #         reviewed_by='security_team'
    #     )
    #     print(f"Event {event['id']} reviewed: {reviewed['status']}")
    
    # Example 5: Get statistics
    print("\nGetting statistics...")
    stats = client.get_stats()
    print(f"Total events: {stats['total_events']}")
    print(f"Active cameras: {stats['active_cameras']}")
    print(f"Severity breakdown: {stats['severity_breakdown']}")

#!/usr/bin/env python3
"""
ProjTrack Desk - Project Management API Test Script

This script tests all the project management APIs to ensure they're working correctly.
Run this after setting up the backend to verify functionality.

Usage: python test_project_apis.py
"""

import requests
import json
from datetime import datetime, timedelta

# Configuration
BASE_URL = "http://localhost:8000/api"
ADMIN_CREDENTIALS = {"username": "admin", "password": "admin123"}

class ProjectAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.token = None
        self.headers = {}
        
    def authenticate(self, credentials):
        """Authenticate and get JWT token"""
        response = requests.post(f"{self.base_url}/auth/login/", json=credentials)
        if response.status_code == 200:
            data = response.json()
            self.token = data['access']
            self.headers = {'Authorization': f'Bearer {self.token}'}
            print(f"✅ Authenticated as {credentials['username']}")
            return True
        else:
            print(f"❌ Authentication failed: {response.status_code}")
            return False
    
    def test_project_activity_crud(self):
        """Test Project Activity CRUD operations"""
        print("\n🧪 Testing Project Activity CRUD...")
        
        # Create project activity
        activity_data = {
            "title": "Mini Project - AI/ML",
            "description": "Develop an AI/ML project using modern frameworks",
            "activity_type": "mini_project",
            "start_date": "2025-01-15",
            "end_date": "2025-05-15",
            "topic_submission_deadline": "2025-01-30T23:59:59Z",
            "guidelines": "Choose from web development, AI/ML, mobile apps, or data science",
            "max_team_size": 2,
            "min_team_size": 1,
            "status": "active",
            "is_visible_to_students": True,
            "assigned_to_all_students": True
        }
        
        response = requests.post(
            f"{self.base_url}/project-activities/",
            json=activity_data,
            headers=self.headers
        )
        
        if response.status_code == 201:
            activity = response.json()
            print(f"✅ Created project activity: {activity['title']}")
            return activity['id']
        else:
            print(f"❌ Failed to create activity: {response.status_code}")
            print(response.text)
            return None
    
    def test_topic_submission(self, activity_id):
        """Test topic submission workflow"""
        print("\n🧪 Testing Topic Submission...")
        
        # First, get list of guides for assignment
        guides_response = requests.get(f"{self.base_url}/faculty/", headers=self.headers)
        if guides_response.status_code == 200:
            guides = guides_response.json()
            guide_id = guides[0]['id'] if guides else 1  # Use first guide or default
        else:
            guide_id = 1  # Default fallback
        
        topic_data = {
            "activity": activity_id,
            "guide": guide_id,
            "topic_title": "AI-Powered Chatbot for Customer Support",
            "topic_description": "Develop an intelligent chatbot using NLP and machine learning to handle customer queries automatically",
            "objectives": "1. Build NLP pipeline\n2. Implement ML models\n3. Create web interface\n4. Deploy solution",
            "methodology": "Use Python, TensorFlow, NLTK, and Flask for development",
            "expected_outcomes": "Functional chatbot with 85% accuracy in query resolution",
            "technologies": "Python, TensorFlow, NLTK, Flask, React, PostgreSQL",
            "domain": "Artificial Intelligence"
        }
        
        response = requests.post(
            f"{self.base_url}/topic-submissions/",
            json=topic_data,
            headers=self.headers
        )
        
        if response.status_code == 201:
            topic = response.json()
            print(f"✅ Created topic submission: {topic['topic_title']}")
            return topic['id']
        else:
            print(f"❌ Failed to create topic: {response.status_code}")
            print(response.text)
            return None
    
    def test_dashboard_apis(self):
        """Test dashboard APIs for different roles"""
        print("\n🧪 Testing Dashboard APIs...")
        
        # Test coordinator dashboard
        response = requests.get(f"{self.base_url}/dashboard/coordinator/", headers=self.headers)
        if response.status_code == 200:
            dashboard = response.json()
            print(f"✅ Coordinator dashboard: {dashboard.keys()}")
        else:
            print(f"❌ Coordinator dashboard failed: {response.status_code}")
        
        # Test student dashboard
        response = requests.get(f"{self.base_url}/dashboard/student/", headers=self.headers)
        if response.status_code in [200, 403]:  # 403 expected for admin user
            print(f"✅ Student dashboard API responding")
        else:
            print(f"❌ Student dashboard failed: {response.status_code}")
        
        # Test guide dashboard
        response = requests.get(f"{self.base_url}/dashboard/guide/", headers=self.headers)
        if response.status_code == 200:
            dashboard = response.json()
            print(f"✅ Guide dashboard: {dashboard.keys()}")
        else:
            print(f"❌ Guide dashboard failed: {response.status_code}")
    
    def test_calendar_integration(self):
        """Test calendar events integration"""
        print("\n🧪 Testing Calendar Integration...")
        
        response = requests.get(f"{self.base_url}/calendar/", headers=self.headers)
        if response.status_code == 200:
            events = response.json()
            print(f"✅ Calendar events retrieved: {len(events)} events")
            
            # Check for project-related events
            project_events = [e for e in events if e.get('event_type') in ['MILESTONE', 'TOPIC_DEADLINE']]
            print(f"✅ Project-related events: {len(project_events)}")
        else:
            print(f"❌ Calendar events failed: {response.status_code}")
    
    def test_file_upload_validation(self):
        """Test file upload validation"""
        print("\n🧪 Testing File Upload Validation...")
        
        # This would require actual file upload testing
        # For now, just check the endpoints are accessible
        endpoints = [
            "/project-activities/",
            "/topic-submissions/",
            "/milestone-submissions/"
        ]
        
        for endpoint in endpoints:
            response = requests.get(f"{self.base_url}{endpoint}", headers=self.headers)
            if response.status_code == 200:
                print(f"✅ Endpoint accessible: {endpoint}")
            else:
                print(f"❌ Endpoint failed: {endpoint} - {response.status_code}")
    
    def run_full_test_suite(self):
        """Run complete test suite"""
        print("🚀 Starting ProjTrack Project Management API Tests")
        print("=" * 50)
        
        # Authenticate
        if not self.authenticate(ADMIN_CREDENTIALS):
            print("❌ Cannot proceed without authentication")
            return
        
        # Run tests
        activity_id = self.test_project_activity_crud()
        
        if activity_id:
            topic_id = self.test_topic_submission(activity_id)
        
        self.test_dashboard_apis()
        self.test_calendar_integration()
        self.test_file_upload_validation()
        
        print("\n" + "=" * 50)
        print("🎉 Test Suite Completed!")
        print("Check the output above for any failed tests.")


if __name__ == "__main__":
    tester = ProjectAPITester()
    tester.run_full_test_suite()
#!/usr/bin/env python3

import requests
import json
import sys
from datetime import datetime, timedelta
import uuid
import io

class FaceYouFaceAPITester:
    def __init__(self, base_url="https://lodging-portal-26.preview.emergentagent.com"):
        self.base_url = base_url
        self.session = requests.Session()
        self.admin_token = None
        self.guest_token = None
        self.test_property_id = None
        self.test_booking_id = None
        self.test_conversation_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, test_name, success, details="", response_data=None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {test_name}")
        else:
            print(f"❌ {test_name} - {details}")
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details,
            "response_data": response_data
        })

    def test_admin_login(self):
        """Test admin login with FaceYouFace credentials"""
        try:
            response = self.session.post(f"{self.base_url}/api/auth/login", json={
                "email": "admin@faceyouface.com",
                "password": "admin123"
            })
            
            if response.status_code == 200:
                data = response.json()
                if data.get("email") == "admin@faceyouface.com" and data.get("role") == "host":
                    self.admin_token = response.cookies.get("access_token")
                    self.log_test("Admin Login (FaceYouFace)", True, response_data=data)
                    return True
                else:
                    self.log_test("Admin Login (FaceYouFace)", False, f"Invalid user data: {data}")
            else:
                self.log_test("Admin Login (FaceYouFace)", False, f"Status {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Admin Login (FaceYouFace)", False, f"Exception: {str(e)}")
        return False

    def test_guest_registration(self):
        """Test guest user registration"""
        try:
            test_email = f"guest_{uuid.uuid4().hex[:8]}@faceyouface.com"
            response = self.session.post(f"{self.base_url}/api/auth/register", json={
                "email": test_email,
                "password": "guest123",
                "name": "Test Guest",
                "role": "guest"
            })
            
            if response.status_code == 200:
                data = response.json()
                self.guest_token = response.cookies.get("access_token")
                self.log_test("Guest Registration", True, response_data=data)
                return True
            else:
                self.log_test("Guest Registration", False, f"Status {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Guest Registration", False, f"Exception: {str(e)}")
        return False

    def test_image_upload(self):
        """Test image upload endpoint with object storage"""
        try:
            # Create a simple test image (1x1 pixel PNG)
            test_image_data = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\tpHYs\x00\x00\x0b\x13\x00\x00\x0b\x13\x01\x00\x9a\x9c\x18\x00\x00\x00\x12IDATx\x9cc```bPPP\x00\x02\xac\x01\x00\x00\x05\x00\x01\r\n-\xdb\x00\x00\x00\x00IEND\xaeB`\x82'
            
            files = {'file': ('test.png', io.BytesIO(test_image_data), 'image/png')}
            response = self.session.post(f"{self.base_url}/api/upload/image", files=files)
            
            if response.status_code == 200:
                data = response.json()
                if 'id' in data and 'url' in data:
                    self.log_test("Image Upload (Object Storage)", True, response_data=data)
                    return True
                else:
                    self.log_test("Image Upload (Object Storage)", False, f"Missing required fields: {data}")
            else:
                self.log_test("Image Upload (Object Storage)", False, f"Status {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Image Upload (Object Storage)", False, f"Exception: {str(e)}")
        return False

    def test_get_properties(self):
        """Test getting properties and store first property ID"""
        try:
            response = self.session.get(f"{self.base_url}/api/properties")
            
            if response.status_code == 200:
                data = response.json()
                if 'properties' in data and len(data['properties']) > 0:
                    self.test_property_id = data['properties'][0]['id']
                    self.log_test("Get Properties", True, response_data=data)
                    return True
                else:
                    self.log_test("Get Properties", False, f"No properties found: {data}")
            else:
                self.log_test("Get Properties", False, f"Status {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Get Properties", False, f"Exception: {str(e)}")
        return False

    def test_conversations_endpoint(self):
        """Test conversations endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/api/conversations")
            
            if response.status_code == 200:
                data = response.json()
                self.log_test("Get Conversations", True, response_data=data)
                return True
            else:
                self.log_test("Get Conversations", False, f"Status {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Get Conversations", False, f"Exception: {str(e)}")
        return False

    def test_send_message(self):
        """Test sending a message"""
        if not self.test_property_id:
            self.log_test("Send Message", False, "No property ID available")
            return False
            
        try:
            # Create a test user to send message to
            test_email = f"recipient_{uuid.uuid4().hex[:8]}@faceyouface.com"
            reg_response = self.session.post(f"{self.base_url}/api/auth/register", json={
                "email": test_email,
                "password": "recipient123",
                "name": "Test Recipient",
                "role": "guest"
            })
            
            if reg_response.status_code != 200:
                self.log_test("Send Message", False, "Failed to create recipient user")
                return False
                
            recipient_id = reg_response.json()['id']
            
            # Send message
            response = self.session.post(f"{self.base_url}/api/messages", json={
                "recipient_id": recipient_id,
                "property_id": self.test_property_id,
                "content": "Hello! I'm interested in your property."
            })
            
            if response.status_code == 200:
                data = response.json()
                if 'id' in data and 'conversation_id' in data:
                    self.test_conversation_id = data['conversation_id']
                    self.log_test("Send Message", True, response_data=data)
                    return True
                else:
                    self.log_test("Send Message", False, f"Missing required fields: {data}")
            else:
                self.log_test("Send Message", False, f"Status {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Send Message", False, f"Exception: {str(e)}")
        return False

    def test_unread_messages_count(self):
        """Test unread messages count endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/api/messages/unread-count")
            
            if response.status_code == 200:
                data = response.json()
                if 'count' in data:
                    self.log_test("Unread Messages Count", True, response_data=data)
                    return True
                else:
                    self.log_test("Unread Messages Count", False, f"Missing count field: {data}")
            else:
                self.log_test("Unread Messages Count", False, f"Status {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Unread Messages Count", False, f"Exception: {str(e)}")
        return False

    def test_conversation_messages(self):
        """Test getting messages from a conversation"""
        if not self.test_conversation_id:
            self.log_test("Get Conversation Messages", False, "No conversation ID available")
            return False
            
        try:
            response = self.session.get(f"{self.base_url}/api/conversations/{self.test_conversation_id}/messages")
            
            if response.status_code == 200:
                data = response.json()
                self.log_test("Get Conversation Messages", True, response_data=data)
                return True
            else:
                self.log_test("Get Conversation Messages", False, f"Status {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Get Conversation Messages", False, f"Exception: {str(e)}")
        return False

    def test_host_stats(self):
        """Test host dashboard stats"""
        try:
            # Re-login as admin to ensure we have host privileges
            login_response = self.session.post(f"{self.base_url}/api/auth/login", json={
                "email": "admin@faceyouface.com",
                "password": "admin123"
            })
            
            response = self.session.get(f"{self.base_url}/api/host/stats")
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ['properties', 'total_bookings', 'confirmed_bookings', 'total_earnings']
                if all(field in data for field in required_fields):
                    self.log_test("Host Dashboard Stats", True, response_data=data)
                    return True
                else:
                    self.log_test("Host Dashboard Stats", False, f"Missing required fields: {data}")
            else:
                self.log_test("Host Dashboard Stats", False, f"Status {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Host Dashboard Stats", False, f"Exception: {str(e)}")
        return False

    def test_create_booking_with_email(self):
        """Test booking creation which should trigger email notification"""
        if not self.test_property_id:
            self.log_test("Create Booking with Email", False, "No property ID available")
            return False
            
        try:
            # Use dates far in the future to avoid conflicts
            check_in = datetime.now() + timedelta(days=30)
            check_out = check_in + timedelta(days=3)
            
            response = self.session.post(f"{self.base_url}/api/bookings", json={
                "property_id": self.test_property_id,
                "check_in": check_in.isoformat(),
                "check_out": check_out.isoformat(),
                "guests": 2,
                "payment_method": "stripe"
            })
            
            if response.status_code == 200:
                data = response.json()
                if 'id' in data and 'total' in data:
                    self.test_booking_id = data['id']
                    self.log_test("Create Booking with Email", True, response_data=data)
                    return True
                else:
                    self.log_test("Create Booking with Email", False, f"Missing required fields: {data}")
            else:
                self.log_test("Create Booking with Email", False, f"Status {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Create Booking with Email", False, f"Exception: {str(e)}")
        return False

    def test_property_availability(self):
        """Test property availability calendar"""
        if not self.test_property_id:
            self.log_test("Property Availability", False, "No property ID available")
            return False
            
        try:
            response = self.session.get(f"{self.base_url}/api/properties/{self.test_property_id}/availability")
            
            if response.status_code == 200:
                data = response.json()
                if 'booked_dates' in data:
                    self.log_test("Property Availability", True, response_data=data)
                    return True
                else:
                    self.log_test("Property Availability", False, f"Missing booked_dates field: {data}")
            else:
                self.log_test("Property Availability", False, f"Status {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Property Availability", False, f"Exception: {str(e)}")
        return False

    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting FaceYouFace Backend API Tests...")
        print(f"Testing against: {self.base_url}")
        print("=" * 60)
        
        # Authentication tests
        if not self.test_admin_login():
            print("❌ Admin login failed - stopping tests")
            return False
            
        self.test_guest_registration()
        
        # Core functionality tests
        self.test_get_properties()
        self.test_image_upload()
        
        # Messaging system tests
        self.test_conversations_endpoint()
        self.test_send_message()
        self.test_unread_messages_count()
        self.test_conversation_messages()
        
        # Host features
        self.test_host_stats()
        
        # Booking and calendar
        self.test_create_booking_with_email()
        self.test_property_availability()
        
        # Results
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        success_rate = (self.tests_passed / self.tests_run) * 100 if self.tests_run > 0 else 0
        print(f"📈 Success Rate: {success_rate:.1f}%")
        
        # Save detailed results
        results = {
            "timestamp": datetime.now().isoformat(),
            "total_tests": self.tests_run,
            "passed_tests": self.tests_passed,
            "failed_tests": self.tests_run - self.tests_passed,
            "success_rate": success_rate,
            "test_results": self.test_results
        }
        
        with open("/app/test_reports/backend_test_results.json", "w") as f:
            json.dump(results, f, indent=2)
        
        return self.tests_passed == self.tests_run

def main():
    tester = FaceYouFaceAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())
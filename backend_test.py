#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

class StayBnBAPITester:
    def __init__(self, base_url: str = "https://lodging-portal-26.preview.emergentagent.com"):
        self.base_url = base_url
        self.session = requests.Session()
        self.access_token = None
        self.user_data = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details,
            "response_data": response_data
        })

    def make_request(self, method: str, endpoint: str, data: Optional[Dict] = None, 
                    expected_status: int = 200, use_auth: bool = False) -> tuple[bool, Dict]:
        """Make HTTP request and validate response"""
        url = f"{self.base_url}/api/{endpoint.lstrip('/')}"
        headers = {'Content-Type': 'application/json'}
        
        if use_auth and self.access_token:
            headers['Authorization'] = f'Bearer {self.access_token}'

        try:
            if method.upper() == 'GET':
                response = self.session.get(url, headers=headers)
            elif method.upper() == 'POST':
                response = self.session.post(url, json=data, headers=headers)
            elif method.upper() == 'PUT':
                response = self.session.put(url, json=data, headers=headers)
            elif method.upper() == 'DELETE':
                response = self.session.delete(url, headers=headers)
            else:
                return False, {"error": f"Unsupported method: {method}"}

            success = response.status_code == expected_status
            try:
                response_data = response.json()
            except:
                response_data = {"status_code": response.status_code, "text": response.text}

            return success, response_data

        except Exception as e:
            return False, {"error": str(e)}

    def test_auth_endpoints(self):
        """Test authentication endpoints"""
        print("\n🔐 Testing Authentication Endpoints...")
        
        # Test user registration
        test_user_data = {
            "email": f"test_user_{datetime.now().strftime('%H%M%S')}@test.com",
            "password": "TestPass123!",
            "name": "Test User",
            "role": "guest"
        }
        
        success, response = self.make_request('POST', 'auth/register', test_user_data, 200)
        self.log_test("User Registration", success, 
                     "" if success else f"Status: {response.get('status_code', 'unknown')}", response)
        
        if success:
            self.user_data = response
        
        # Test admin login
        admin_login_data = {
            "email": "admin@staybnb.com",
            "password": "admin123"
        }
        
        success, response = self.make_request('POST', 'auth/login', admin_login_data, 200)
        self.log_test("Admin Login", success, 
                     "" if success else f"Status: {response.get('status_code', 'unknown')}", response)
        
        if success and 'id' in response:
            # Extract token from cookies if available
            for cookie in self.session.cookies:
                if cookie.name == 'access_token':
                    self.access_token = cookie.value
                    break
        
        # Test get current user
        success, response = self.make_request('GET', 'auth/me', expected_status=200, use_auth=True)
        self.log_test("Get Current User", success, 
                     "" if success else f"Status: {response.get('status_code', 'unknown')}", response)
        
        # Test logout
        success, response = self.make_request('POST', 'auth/logout', expected_status=200)
        self.log_test("User Logout", success, 
                     "" if success else f"Status: {response.get('status_code', 'unknown')}", response)

    def test_property_endpoints(self):
        """Test property-related endpoints"""
        print("\n🏠 Testing Property Endpoints...")
        
        # Test get all properties
        success, response = self.make_request('GET', 'properties', expected_status=200)
        self.log_test("Get All Properties", success, 
                     "" if success else f"Status: {response.get('status_code', 'unknown')}", response)
        
        properties = response.get('properties', []) if success else []
        
        # Test get featured properties
        success, response = self.make_request('GET', 'properties/featured', expected_status=200)
        self.log_test("Get Featured Properties", success, 
                     "" if success else f"Status: {response.get('status_code', 'unknown')}", response)
        
        # Test property search with filters
        success, response = self.make_request('GET', 'properties?city=Barcelona&property_type=villa', expected_status=200)
        self.log_test("Property Search with Filters", success, 
                     "" if success else f"Status: {response.get('status_code', 'unknown')}", response)
        
        # Test get specific property
        if properties:
            property_id = properties[0]['id']
            success, response = self.make_request('GET', f'properties/{property_id}', expected_status=200)
            self.log_test("Get Specific Property", success, 
                         "" if success else f"Status: {response.get('status_code', 'unknown')}", response)
            
            # Test property availability
            success, response = self.make_request('GET', f'properties/{property_id}/availability', expected_status=200)
            self.log_test("Get Property Availability", success, 
                         "" if success else f"Status: {response.get('status_code', 'unknown')}", response)

    def test_booking_endpoints(self):
        """Test booking-related endpoints"""
        print("\n📅 Testing Booking Endpoints...")
        
        # Re-login as admin to test host features
        admin_login_data = {
            "email": "admin@staybnb.com",
            "password": "admin123"
        }
        
        success, response = self.make_request('POST', 'auth/login', admin_login_data, 200)
        if success:
            for cookie in self.session.cookies:
                if cookie.name == 'access_token':
                    self.access_token = cookie.value
                    break
        
        # Get properties first
        success, response = self.make_request('GET', 'properties', expected_status=200)
        properties = response.get('properties', []) if success else []
        
        if properties:
            property_id = properties[0]['id']
            
            # Test create booking
            booking_data = {
                "property_id": property_id,
                "check_in": (datetime.now() + timedelta(days=7)).isoformat(),
                "check_out": (datetime.now() + timedelta(days=10)).isoformat(),
                "guests": 2,
                "payment_method": "stripe"
            }
            
            success, response = self.make_request('POST', 'bookings', booking_data, 200, use_auth=True)
            self.log_test("Create Booking", success, 
                         "" if success else f"Status: {response.get('status_code', 'unknown')}", response)
            
            booking_id = response.get('id') if success else None
            
            # Test get user bookings
            success, response = self.make_request('GET', 'bookings', expected_status=200, use_auth=True)
            self.log_test("Get User Bookings", success, 
                         "" if success else f"Status: {response.get('status_code', 'unknown')}", response)
            
            # Test get specific booking
            if booking_id:
                success, response = self.make_request('GET', f'bookings/{booking_id}', expected_status=200, use_auth=True)
                self.log_test("Get Specific Booking", success, 
                             "" if success else f"Status: {response.get('status_code', 'unknown')}", response)

    def test_host_endpoints(self):
        """Test host-specific endpoints"""
        print("\n👨‍💼 Testing Host Endpoints...")
        
        # Test get host properties
        success, response = self.make_request('GET', 'host/properties', expected_status=200, use_auth=True)
        self.log_test("Get Host Properties", success, 
                     "" if success else f"Status: {response.get('status_code', 'unknown')}", response)
        
        # Test get host bookings
        success, response = self.make_request('GET', 'host/bookings', expected_status=200, use_auth=True)
        self.log_test("Get Host Bookings", success, 
                     "" if success else f"Status: {response.get('status_code', 'unknown')}", response)
        
        # Test get host stats
        success, response = self.make_request('GET', 'host/stats', expected_status=200, use_auth=True)
        self.log_test("Get Host Stats", success, 
                     "" if success else f"Status: {response.get('status_code', 'unknown')}", response)

    def test_favorites_endpoints(self):
        """Test favorites functionality"""
        print("\n❤️ Testing Favorites Endpoints...")
        
        # Get properties first
        success, response = self.make_request('GET', 'properties', expected_status=200)
        properties = response.get('properties', []) if success else []
        
        if properties:
            property_id = properties[0]['id']
            
            # Test add to favorites
            success, response = self.make_request('POST', f'favorites/{property_id}', expected_status=200, use_auth=True)
            self.log_test("Add to Favorites", success, 
                         "" if success else f"Status: {response.get('status_code', 'unknown')}", response)
            
            # Test get favorites
            success, response = self.make_request('GET', 'favorites', expected_status=200, use_auth=True)
            self.log_test("Get Favorites", success, 
                         "" if success else f"Status: {response.get('status_code', 'unknown')}", response)
            
            # Test remove from favorites
            success, response = self.make_request('DELETE', f'favorites/{property_id}', expected_status=200, use_auth=True)
            self.log_test("Remove from Favorites", success, 
                         "" if success else f"Status: {response.get('status_code', 'unknown')}", response)

    def test_payment_endpoints(self):
        """Test payment-related endpoints"""
        print("\n💳 Testing Payment Endpoints...")
        
        # Get properties and create a booking first
        success, response = self.make_request('GET', 'properties', expected_status=200)
        properties = response.get('properties', []) if success else []
        
        if properties:
            property_id = properties[0]['id']
            
            # Create a booking
            booking_data = {
                "property_id": property_id,
                "check_in": (datetime.now() + timedelta(days=14)).isoformat(),
                "check_out": (datetime.now() + timedelta(days=17)).isoformat(),
                "guests": 2,
                "payment_method": "stripe"
            }
            
            success, response = self.make_request('POST', 'bookings', booking_data, 200, use_auth=True)
            booking_id = response.get('id') if success else None
            
            if booking_id:
                # Test create Stripe payment session
                payment_data = {
                    "booking_id": booking_id,
                    "amount": 500.0,
                    "payment_method": "stripe",
                    "origin_url": "https://lodging-portal-26.preview.emergentagent.com"
                }
                
                success, response = self.make_request('POST', 'payments/stripe/create-session', payment_data, 200, use_auth=True)
                self.log_test("Create Stripe Payment Session", success, 
                             "" if success else f"Status: {response.get('status_code', 'unknown')}", response)

    def run_all_tests(self):
        """Run all test suites"""
        print("🚀 Starting StayBnB API Tests...")
        print(f"Testing against: {self.base_url}")
        
        try:
            self.test_auth_endpoints()
            self.test_property_endpoints()
            self.test_booking_endpoints()
            self.test_host_endpoints()
            self.test_favorites_endpoints()
            self.test_payment_endpoints()
            
        except Exception as e:
            print(f"❌ Test suite failed with error: {e}")
            return False
        
        # Print summary
        print(f"\n📊 Test Summary:")
        print(f"Tests run: {self.tests_run}")
        print(f"Tests passed: {self.tests_passed}")
        print(f"Tests failed: {self.tests_run - self.tests_passed}")
        print(f"Success rate: {(self.tests_passed / self.tests_run * 100):.1f}%")
        
        return self.tests_passed == self.tests_run

def main():
    tester = StayBnBAPITester()
    success = tester.run_all_tests()
    
    # Save detailed results
    with open('/app/test_reports/backend_test_results.json', 'w') as f:
        json.dump({
            "timestamp": datetime.now().isoformat(),
            "total_tests": tester.tests_run,
            "passed_tests": tester.tests_passed,
            "failed_tests": tester.tests_run - tester.tests_passed,
            "success_rate": (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0,
            "test_results": tester.test_results
        }, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())
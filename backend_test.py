import requests
import json
import sys
from datetime import datetime

class SomvanshiCRMTester:
    def __init__(self, base_url="https://somvanshi-sales.preview.emergentagent.com"):
        self.base_url = base_url
        self.admin_token = None
        self.sales_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
        # Test credentials
        self.admin_email = "ameya@somvanshi.tech"
        self.sales_email = "rajdeep@somvanshi.tech"
        self.password = "SomvanshiTechnologies@101025"

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "name": name,
            "success": success,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, token=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = f'Bearer {token}'

        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)

            print(f"   Status: {response.status_code}")
            success = response.status_code == expected_status
            
            if success:
                try:
                    response_data = response.json()
                    self.log_test(name, True)
                    return True, response_data
                except:
                    self.log_test(name, True, "No JSON response")
                    return True, {}
            else:
                try:
                    error_data = response.json()
                    self.log_test(name, False, f"Status {response.status_code}: {error_data}")
                except:
                    self.log_test(name, False, f"Status {response.status_code}: {response.text[:200]}")
                return False, {}

        except Exception as e:
            self.log_test(name, False, f"Request error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test API health endpoints"""
        print("\n=== HEALTH CHECK TESTS ===")
        self.run_test("Health Check", "GET", "health", 200)
        self.run_test("Root Endpoint", "GET", "", 200)

    def test_authentication(self):
        """Test login functionality"""
        print("\n=== AUTHENTICATION TESTS ===")
        
        # Test admin login
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            {"email": self.admin_email, "password": self.password}
        )
        if success and 'token' in response:
            self.admin_token = response['token']
            print(f"   Admin token obtained: {self.admin_token[:20]}...")
        
        # Test sales login
        success, response = self.run_test(
            "Sales User Login",
            "POST",
            "auth/login",
            200,
            {"email": self.sales_email, "password": self.password}
        )
        if success and 'token' in response:
            self.sales_token = response['token']
            print(f"   Sales token obtained: {self.sales_token[:20]}...")

        # Test invalid login
        self.run_test(
            "Invalid Login",
            "POST",
            "auth/login",
            401,
            {"email": "invalid@test.com", "password": "wrongpass"}
        )

        # Test auth/me endpoint
        if self.admin_token:
            self.run_test("Get Admin Profile", "GET", "auth/me", 200, token=self.admin_token)
        
        if self.sales_token:
            self.run_test("Get Sales Profile", "GET", "auth/me", 200, token=self.sales_token)

    def test_user_management(self):
        """Test user-related endpoints"""
        print("\n=== USER MANAGEMENT TESTS ===")
        
        if self.admin_token:
            self.run_test("Get All Users", "GET", "users", 200, token=self.admin_token)
            self.run_test("Get Sales Users", "GET", "users/sales", 200, token=self.admin_token)
        
        if self.sales_token:
            self.run_test("Sales User Get Users", "GET", "users", 200, token=self.sales_token)

    def test_leads_management(self):
        """Test leads CRUD operations"""
        print("\n=== LEADS MANAGEMENT TESTS ===")
        
        lead_id = None
        
        if self.admin_token:
            # Create a lead
            lead_data = {
                "company_name": "Test Company Ltd",
                "website": "https://testcompany.com",
                "industry": "Technology",
                "company_size": "11-50",
                "location": "Mumbai, India",
                "contact_name": "John Doe",
                "contact_designation": "CEO",
                "contact_email": "john@testcompany.com",
                "contact_phone": "+91 9876543210",
                "source": "LinkedIn",
                "estimated_value": 500000,
                "notes": "Test lead created during automated testing"
            }
            
            success, response = self.run_test(
                "Create Lead",
                "POST",
                "leads",
                200,
                lead_data,
                self.admin_token
            )
            if success and 'id' in response:
                lead_id = response['id']
                print(f"   Lead created with ID: {lead_id}")
            
            # Get all leads
            self.run_test("Get All Leads", "GET", "leads", 200, token=self.admin_token)
            
            # Get specific lead
            if lead_id:
                self.run_test(
                    "Get Specific Lead",
                    "GET",
                    f"leads/{lead_id}",
                    200,
                    token=self.admin_token
                )
                
                # Update lead
                update_data = {
                    "stage": "Contacted",
                    "estimated_value": 600000,
                    "notes": "Updated during testing"
                }
                self.run_test(
                    "Update Lead",
                    "PUT",
                    f"leads/{lead_id}",
                    200,
                    update_data,
                    self.admin_token
                )
            
            # Test filtering leads by stage
            self.run_test(
                "Filter Leads by Stage",
                "GET",
                "leads?stage=Lead Identified",
                200,
                token=self.admin_token
            )
        
        # Test with sales user
        if self.sales_token:
            self.run_test("Sales User Get Leads", "GET", "leads", 200, token=self.sales_token)

    def test_pipeline_management(self):
        """Test pipeline endpoints"""
        print("\n=== PIPELINE MANAGEMENT TESTS ===")
        
        if self.admin_token:
            self.run_test("Get Pipeline", "GET", "pipeline", 200, token=self.admin_token)
        
        if self.sales_token:
            self.run_test("Sales User Get Pipeline", "GET", "pipeline", 200, token=self.sales_token)

    def test_activities_management(self):
        """Test activities endpoints"""
        print("\n=== ACTIVITIES MANAGEMENT TESTS ===")
        
        if self.admin_token:
            # Get all activities
            self.run_test("Get All Activities", "GET", "activities", 200, token=self.admin_token)
            
            # Get leads to create activity for
            success, leads_response = self.run_test(
                "Get Leads for Activity",
                "GET", 
                "leads",
                200,
                token=self.admin_token
            )
            
            if success and leads_response and len(leads_response) > 0:
                lead_id = leads_response[0]['id']
                
                # Create activity
                activity_data = {
                    "lead_id": lead_id,
                    "activity_type": "Call",
                    "description": "Test call activity created during automated testing"
                }
                
                success, activity_response = self.run_test(
                    "Create Activity",
                    "POST",
                    "activities",
                    200,
                    activity_data,
                    self.admin_token
                )
                
                if success and 'id' in activity_response:
                    activity_id = activity_response['id']
                    # Complete activity
                    self.run_test(
                        "Complete Activity",
                        "PUT",
                        f"activities/{activity_id}/complete",
                        200,
                        token=self.admin_token
                    )

    def test_meetings_management(self):
        """Test meetings endpoints"""
        print("\n=== MEETINGS MANAGEMENT TESTS ===")
        
        if self.admin_token:
            # Get all meetings
            self.run_test("Get All Meetings", "GET", "meetings", 200, token=self.admin_token)
            
            # Get leads to create meeting for
            success, leads_response = self.run_test(
                "Get Leads for Meeting",
                "GET",
                "leads",
                200,
                token=self.admin_token
            )
            
            if success and leads_response and len(leads_response) > 0:
                lead_id = leads_response[0]['id']
                
                # Create meeting
                meeting_data = {
                    "lead_id": lead_id,
                    "meeting_type": "Discovery",
                    "scheduled_at": "2024-12-31T10:00:00",
                    "notes": "Test meeting created during automated testing"
                }
                
                success, meeting_response = self.run_test(
                    "Create Meeting",
                    "POST",
                    "meetings",
                    200,
                    meeting_data,
                    self.admin_token
                )
                
                if success and 'id' in meeting_response:
                    meeting_id = meeting_response['id']
                    # Update meeting
                    update_data = {
                        "outcome": "Good meeting",
                        "completed": True
                    }
                    self.run_test(
                        "Update Meeting",
                        "PUT",
                        f"meetings/{meeting_id}",
                        200,
                        update_data,
                        self.admin_token
                    )

    def test_notifications(self):
        """Test notifications endpoints"""
        print("\n=== NOTIFICATIONS TESTS ===")
        
        if self.admin_token:
            self.run_test("Get Notifications", "GET", "notifications", 200, token=self.admin_token)
            self.run_test("Mark All Read", "PUT", "notifications/read-all", 200, token=self.admin_token)
        
        if self.sales_token:
            self.run_test("Sales User Get Notifications", "GET", "notifications", 200, token=self.sales_token)

    def test_dashboard_stats(self):
        """Test dashboard endpoints"""
        print("\n=== DASHBOARD TESTS ===")
        
        if self.admin_token:
            self.run_test("Get Dashboard Stats", "GET", "dashboard/stats", 200, token=self.admin_token)
            self.run_test("Get Team Performance", "GET", "dashboard/performance", 200, token=self.admin_token)
        
        if self.sales_token:
            self.run_test("Sales User Dashboard Stats", "GET", "dashboard/stats", 200, token=self.sales_token)
            # Sales user should not access team performance
            self.run_test(
                "Sales User Team Performance (Should Fail)",
                "GET",
                "dashboard/performance",
                403,
                token=self.sales_token
            )

    def test_reports(self):
        """Test reports endpoints"""
        print("\n=== REPORTS TESTS ===")
        
        if self.admin_token:
            self.run_test("Get Leads Report", "GET", "reports/leads?period=week", 200, token=self.admin_token)
            self.run_test("Get Revenue Report", "GET", "reports/revenue?period=month", 200, token=self.admin_token)
            self.run_test("Export Data", "GET", "reports/export", 200, token=self.admin_token)
        
        if self.sales_token:
            self.run_test("Sales User Leads Report", "GET", "reports/leads?period=week", 200, token=self.sales_token)

    def run_all_tests(self):
        """Run all test suites"""
        print("🚀 Starting Somvanshi CRM API Testing...")
        print(f"Base URL: {self.base_url}")
        
        # Run test suites in order
        self.test_health_check()
        self.test_authentication()
        
        if self.admin_token or self.sales_token:
            self.test_user_management()
            self.test_leads_management()
            self.test_pipeline_management()
            self.test_activities_management()
            self.test_meetings_management()
            self.test_notifications()
            self.test_dashboard_stats()
            self.test_reports()
        else:
            print("❌ Could not obtain authentication tokens. Skipping protected endpoints.")
        
        # Print summary
        print(f"\n📊 TEST SUMMARY")
        print(f"Tests run: {self.tests_run}")
        print(f"Tests passed: {self.tests_passed}")
        print(f"Tests failed: {self.tests_run - self.tests_passed}")
        print(f"Success rate: {(self.tests_passed / self.tests_run * 100):.1f}%")
        
        if self.tests_passed < self.tests_run:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result['success']:
                    print(f"  - {result['name']}: {result['details']}")
        
        return self.tests_passed == self.tests_run

def main():
    tester = SomvanshiCRMTester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())
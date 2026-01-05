import logging

from locust import HttpUser, between, task

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class StockVerifyUser(HttpUser):
    """
    Simulates a standard staff user using PIN login.
    """

    wait_time = between(1, 3)
    weight = 20  # Higher weight to simulate more staff users

    # Valid PIN for testing
    TEST_PIN = "1234"

    def on_start(self):
        """
        Login on start to get a token.
        """
        self.login()

    def login(self):
        response = self.client.post("/api/auth/login-pin", json={"pin": self.TEST_PIN})
        if response.status_code == 200:
            token = response.json().get("data", {}).get("access_token")
            if token:
                self.client.headers.update({"Authorization": f"Bearer {token}"})
            else:
                logger.error("Login successful but no token found in response")
        else:
            logger.error(f"Staff Login failed: {response.status_code} - {response.text}")

    @task(5)
    def check_health(self):
        self.client.get("/api/health")

    @task(10)
    def scan_item(self):
        # Simulate scanning an item (using a known barcode from seed data)
        # Using /api/erp/items/barcode/{barcode}
        self.client.get("/api/erp/items/barcode/510001")


class AdminUser(HttpUser):
    """
    Simulates an admin user using username/password login.
    """

    wait_time = between(2, 5)
    weight = 1  # Lower weight for fewer admins

    def on_start(self):
        self.login()

    def login(self):
        response = self.client.post(
            "/api/auth/login", json={"username": "admin", "password": "admin123"}
        )
        if response.status_code == 200:
            token = response.json().get("data", {}).get("access_token")
            if token:
                self.client.headers.update({"Authorization": f"Bearer {token}"})
            else:
                logger.error("Admin Login successful but no token found")
        else:
            logger.error(f"Admin Login failed: {response.status_code} - {response.text}")

    @task(5)
    def view_dashboard(self):
        # Using /api/admin/dashboard/kpis
        self.client.get("/api/admin/dashboard/kpis")

    @task(2)
    def check_users(self):
        self.client.get("/api/users")

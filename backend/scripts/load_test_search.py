import random

from locust import HttpUser, between, task


class SearchUser(HttpUser):
    wait_time = between(1, 3)
    token = None

    def on_start(self):
        """Login to get JWT token"""
        # Assuming default admin credentials or a test user
        # You might need to adjust these credentials based on your seed data
        response = self.client.post(
            "/api/auth/token", data={"username": "admin", "password": "password123"}
        )
        if response.status_code == 200:
            self.token = response.json()["access_token"]
        else:
            print("Failed to login:", response.text)

    @task(3)
    def search_items(self):
        """Test optimized search endpoint"""
        if not self.token:
            return

        headers = {"Authorization": f"Bearer {self.token}"}

        # Search terms likely to exist
        queries = ["item", "test", "51", "52", "53", "a", "b", "c"]
        query = random.choice(queries)

        self.client.post(
            "/api/items/search/optimized",
            json={"query": query, "limit": 20, "offset": 0},
            headers=headers,
            name="/api/items/search/optimized",
        )

    @task(1)
    def search_exact_barcode(self):
        """Test exact barcode search"""
        if not self.token:
            return

        headers = {"Authorization": f"Bearer {self.token}"}
        # Example barcode prefix
        barcode = f"51{random.randint(1000, 9999)}"

        self.client.post(
            "/api/items/search/optimized",
            json={"query": barcode, "limit": 1, "offset": 0},
            headers=headers,
            name="/api/items/search/optimized (barcode)",
        )

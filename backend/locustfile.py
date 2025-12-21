from locust import HttpUser, between, task


class StockVerifyUser(HttpUser):
    # Simulate a user thinking for 1-3 seconds between tasks
    wait_time = between(1, 3)

    # Valid PIN for testing (Assuming default '1234' exists or similar)
    # Ideally this should be dynamic or pulled from env, but hardcoding provided '1234'
    # from previous context for the 'staff1' user if available.
    TEST_PIN = "1234"

    @task(3)
    def login_pin(self):
        """
        Simulate pin login.
        This hits the optimized O(1) endpoint.
        """
        self.client.post("/api/auth/login-pin", json={"pin": self.TEST_PIN})

    @task(1)
    def health_check(self):
        """
        Lightweight check to ensure server is responsive.
        """
        self.client.get(
            "/api/diagnosis/health"
        )  # Use a valid API endpoint or just root health if exposed

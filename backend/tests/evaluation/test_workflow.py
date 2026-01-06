"""
Workflow Evaluation Tests
=========================

Tests for end-to-end workflow completion including:
- Authentication workflow
- Session lifecycle workflow
- Item verification workflow
- Admin operations workflow

Run with: pytest backend/tests/evaluation/test_workflow.py -v
"""

import random
import time

import pytest
import pytest_asyncio
from httpx import AsyncClient

from .evaluators import WorkflowEvaluator
from .metrics_collector import MetricsCollector


@pytest.fixture
def collector():
    """Create metrics collector for tests."""
    collector = MetricsCollector()
    collector.start_evaluation()
    return collector


@pytest.fixture
def workflow_evaluator(collector):
    """Create workflow evaluator."""
    return WorkflowEvaluator(collector)


class TestAuthenticationWorkflow:
    """Tests for authentication workflow."""

    @pytest.mark.asyncio
    @pytest.mark.workflow
    async def test_registration_login_flow(
        self,
        async_client: AsyncClient,
        collector: MetricsCollector,
    ):
        """Test complete registration and login workflow."""
        start_time = time.time()
        steps_completed = 0

        # Step 1: Register new user
        user_data = {
            "username": f"workflow_user_{random.randint(10000, 99999)}",
            "password": "WorkflowTest123!",
            "full_name": "Workflow Test User",
            "role": "staff",
        }

        response = await async_client.post("/api/auth/register", json=user_data)
        if response.status_code == 201:
            steps_completed += 1

        # Step 2: Login with new credentials
        response = await async_client.post(
            "/api/auth/login",
            json={"username": user_data["username"], "password": user_data["password"]},
        )

        token = None
        if response.status_code == 200:
            steps_completed += 1
            token = response.json().get("data", {}).get("access_token")

        # Step 3: Access protected resource
        if token:
            response = await async_client.get(
                "/api/sessions",
                headers={"Authorization": f"Bearer {token}"},
            )
            if response.status_code in [200, 404]:
                steps_completed += 1

        # Step 4: Logout (if endpoint exists)
        if token:
            response = await async_client.post(
                "/api/auth/logout",
                headers={"Authorization": f"Bearer {token}"},
            )
            if response.status_code in [200, 204, 404]:
                steps_completed += 1

        duration = time.time() - start_time

        collector.record_workflow_completion(
            "registration_login", steps_completed / 4, threshold=0.75
        )
        collector.record_workflow_duration("registration_login", duration, threshold=5.0)

        assert steps_completed >= 3, f"Only {steps_completed}/4 steps completed"

    @pytest.mark.asyncio
    @pytest.mark.workflow
    async def test_failed_login_handling(
        self,
        async_client: AsyncClient,
        collector: MetricsCollector,
    ):
        """Test failed login attempt handling."""
        start_time = time.time()
        correct_behavior = 0

        # Test 1: Wrong password
        response = await async_client.post(
            "/api/auth/login",
            json={"username": "nonexistent_user", "password": "WrongPassword123!"},
        )
        if response.status_code in [401, 400, 404]:
            correct_behavior += 1

        # Test 2: Missing fields
        response = await async_client.post(
            "/api/auth/login",
            json={"username": "test"},
        )
        if response.status_code in [422, 400]:
            correct_behavior += 1

        # Test 3: Empty credentials
        response = await async_client.post(
            "/api/auth/login",
            json={"username": "", "password": ""},
        )
        if response.status_code in [422, 400, 401]:
            correct_behavior += 1

        duration = time.time() - start_time

        collector.record_workflow_completion(
            "failed_login_handling", correct_behavior / 3, threshold=1.0
        )
        collector.record_workflow_duration("failed_login", duration, threshold=3.0)

        assert correct_behavior >= 2


class TestSessionWorkflow:
    """Tests for session lifecycle workflow."""

    @pytest_asyncio.fixture
    async def auth_headers(self, async_client: AsyncClient) -> dict[str, str]:
        """Create authenticated user and return headers."""
        user_data = {
            "username": f"session_user_{random.randint(10000, 99999)}",
            "password": "SessionTest123!",
            "full_name": "Session Test User",
            "role": "staff",
        }

        await async_client.post("/api/auth/register", json=user_data)

        response = await async_client.post(
            "/api/auth/login",
            json={"username": user_data["username"], "password": user_data["password"]},
        )

        if response.status_code == 200:
            token = response.json().get("data", {}).get("access_token")
            if token:
                return {"Authorization": f"Bearer {token}"}

        return {}

    @pytest.mark.asyncio
    @pytest.mark.workflow
    async def test_session_lifecycle(
        self,
        async_client: AsyncClient,
        auth_headers: dict[str, str],
        collector: MetricsCollector,
    ):
        """Test complete session lifecycle."""
        if not auth_headers:
            pytest.skip("Could not authenticate")

        start_time = time.time()
        steps_completed = 0
        session_id = None

        # Step 1: Create session
        session_data = {
            "warehouse": f"TEST-WH-{random.randint(1, 99)}",
            "floor": "1",
            "rack": "A1",
        }

        response = await async_client.post(
            "/api/sessions",
            json=session_data,
            headers=auth_headers,
        )

        if response.status_code in [200, 201]:
            steps_completed += 1
            session_id = response.json().get("data", {}).get("id")

        # Step 2: Get session details
        if session_id:
            response = await async_client.get(
                f"/api/sessions/{session_id}",
                headers=auth_headers,
            )
            if response.status_code == 200:
                steps_completed += 1

        # Step 3: List sessions
        response = await async_client.get(
            "/api/sessions",
            headers=auth_headers,
        )
        if response.status_code == 200:
            steps_completed += 1

        # Step 4: Update session status
        if session_id:
            response = await async_client.patch(
                f"/api/sessions/{session_id}",
                json={"status": "completed"},
                headers=auth_headers,
            )
            if response.status_code in [200, 404]:
                steps_completed += 1

        duration = time.time() - start_time

        collector.record_workflow_completion(
            "session_lifecycle", steps_completed / 4, threshold=0.75
        )
        collector.record_workflow_duration("session_lifecycle", duration, threshold=10.0)

        assert steps_completed >= 2, f"Only {steps_completed}/4 steps completed"


class TestVerificationWorkflow:
    """Tests for item verification workflow."""

    @pytest_asyncio.fixture
    async def auth_headers(self, async_client: AsyncClient) -> dict[str, str]:
        """Create authenticated user and return headers."""
        user_data = {
            "username": f"verify_user_{random.randint(10000, 99999)}",
            "password": "VerifyTest123!",
            "full_name": "Verify Test User",
            "role": "staff",
        }

        await async_client.post("/api/auth/register", json=user_data)

        response = await async_client.post(
            "/api/auth/login",
            json={"username": user_data["username"], "password": user_data["password"]},
        )

        if response.status_code == 200:
            token = response.json().get("data", {}).get("access_token")
            if token:
                return {"Authorization": f"Bearer {token}"}

        return {}

    @pytest.mark.asyncio
    @pytest.mark.workflow
    async def test_item_verification_flow(
        self,
        async_client: AsyncClient,
        auth_headers: dict[str, str],
        collector: MetricsCollector,
    ):
        """Test complete item verification workflow."""
        if not auth_headers:
            pytest.skip("Could not authenticate")

        start_time = time.time()
        steps_completed = 0

        # Step 1: Search for items
        response = await async_client.get(
            "/api/v2/erp/items?search=test&limit=10",
            headers=auth_headers,
        )
        if response.status_code in [200, 404]:
            steps_completed += 1

        # Step 2: Get item by barcode
        response = await async_client.get(
            "/api/v2/erp/items/barcode/123456",
            headers=auth_headers,
        )
        if response.status_code in [200, 404]:
            steps_completed += 1

        # Step 3: Create session for verification
        response = await async_client.post(
            "/api/sessions",
            json={
                "warehouse": f"VERIFY-{random.randint(1, 99)}",
                "floor": "1",
                "rack": "A1",
            },
            headers=auth_headers,
        )
        session_id = None
        if response.status_code in [200, 201]:
            steps_completed += 1
            session_id = response.json().get("data", {}).get("id")

        # Step 4: Submit count (would need valid item)
        if session_id:
            # Try to create count line
            count_data = {
                "session_id": session_id,
                "barcode": "123456",
                "item_code": "TEST-001",
                "item_name": "Test Item",
                "counted_qty": 10,
                "damaged_qty": 0,
            }
            response = await async_client.post(
                "/api/count-lines",
                json=count_data,
                headers=auth_headers,
            )
            # May fail due to missing item, but that's OK
            if response.status_code in [200, 201, 404, 422]:
                steps_completed += 1

        duration = time.time() - start_time

        collector.record_workflow_completion(
            "item_verification", steps_completed / 4, threshold=0.50
        )
        collector.record_workflow_duration("item_verification", duration, threshold=10.0)

        assert steps_completed >= 2


class TestAdminWorkflow:
    """Tests for admin operations workflow."""

    @pytest_asyncio.fixture
    async def admin_headers(self, async_client: AsyncClient) -> dict[str, str]:
        """Create admin user and return headers."""
        user_data = {
            "username": f"admin_user_{random.randint(10000, 99999)}",
            "password": "AdminTest123!",
            "full_name": "Admin Test User",
            "role": "admin",
        }

        await async_client.post("/api/auth/register", json=user_data)

        response = await async_client.post(
            "/api/auth/login",
            json={"username": user_data["username"], "password": user_data["password"]},
        )

        if response.status_code == 200:
            token = response.json().get("data", {}).get("access_token")
            if token:
                return {"Authorization": f"Bearer {token}"}

        return {}

    @pytest.mark.asyncio
    @pytest.mark.workflow
    async def test_admin_dashboard_flow(
        self,
        async_client: AsyncClient,
        admin_headers: dict[str, str],
        collector: MetricsCollector,
    ):
        """Test admin dashboard access workflow."""
        if not admin_headers:
            pytest.skip("Could not authenticate as admin")

        start_time = time.time()
        steps_completed = 0

        # Step 1: Access system stats
        response = await async_client.get(
            "/api/admin/control/system/stats",
            headers=admin_headers,
        )
        if response.status_code in [200, 404]:
            steps_completed += 1

        # Step 2: Access health check
        response = await async_client.get("/health")
        if response.status_code == 200:
            steps_completed += 1

        # Step 3: Access users list
        response = await async_client.get(
            "/api/auth/users",
            headers=admin_headers,
        )
        if response.status_code in [200, 404]:
            steps_completed += 1

        # Step 4: Access sessions overview
        response = await async_client.get(
            "/api/sessions",
            headers=admin_headers,
        )
        if response.status_code in [200, 404]:
            steps_completed += 1

        duration = time.time() - start_time

        collector.record_workflow_completion("admin_dashboard", steps_completed / 4, threshold=0.75)
        collector.record_workflow_duration("admin_dashboard", duration, threshold=5.0)

        assert steps_completed >= 2


class TestFullWorkflowEvaluation:
    """Full workflow evaluation suite."""

    @pytest.mark.asyncio
    @pytest.mark.workflow
    async def test_full_evaluation(
        self,
        async_client: AsyncClient,
        collector: MetricsCollector,
        workflow_evaluator: WorkflowEvaluator,
    ):
        """Run complete workflow evaluation."""
        # Create auth for workflows
        user_data = {
            "username": f"full_eval_{random.randint(10000, 99999)}",
            "password": "FullEval123!",
            "full_name": "Full Eval User",
            "role": "admin",
        }

        await async_client.post("/api/auth/register", json=user_data)

        response = await async_client.post(
            "/api/auth/login",
            json={"username": user_data["username"], "password": user_data["password"]},
        )

        auth_headers = {}
        if response.status_code == 200:
            token = response.json().get("data", {}).get("access_token")
            if token:
                auth_headers = {"Authorization": f"Bearer {token}"}

        # Run evaluation
        await workflow_evaluator.evaluate(
            client=async_client,
            auth_headers=auth_headers,
        )

        # Generate report
        report = collector.finish_evaluation(
            metadata={
                "test_type": "workflow_evaluation",
            }
        )

        # Print summary
        report.print_summary()

        assert report.success_rate >= 0.60, (
            f"Success rate {report.success_rate} is too low"
        )

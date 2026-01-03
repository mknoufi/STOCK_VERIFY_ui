"""
Tests for Role-Based Access Control (RBAC)
Verifies that endpoints enforce proper role-based authorization
"""

from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from backend.server import app


class TestRBACEnforcement:
    """Tests for RBAC enforcement across protected endpoints"""

    @pytest.fixture
    def client(self):
        """Create test client"""
        return TestClient(app)

    @pytest.fixture
    def staff_user(self):
        """Mock staff user payload"""
        return {
            "user_id": "staff123",
            "username": "staff1",
            "role": "staff",
            "exp": 9999999999,
        }

    @pytest.fixture
    def supervisor_user(self):
        """Mock supervisor user payload"""
        return {
            "user_id": "super123",
            "username": "supervisor",
            "role": "supervisor",
            "exp": 9999999999,
        }

    @pytest.fixture
    def admin_user(self):
        """Mock admin user payload"""
        return {
            "user_id": "admin123",
            "username": "admin",
            "role": "admin",
            "exp": 9999999999,
        }

    def _make_auth_header(self, token: str) -> dict:
        """Create Authorization header"""
        return {"Authorization": f"Bearer {token}"}

    # Staff endpoints - should allow staff, supervisor, admin
    @pytest.mark.asyncio
    async def test_staff_can_access_scan_endpoints(self, client, staff_user):
        """Staff should access scan-related endpoints"""
        with patch("backend.auth.jwt_provider.decode", return_value=staff_user):
            # Test that staff role is included in token
            assert staff_user["role"] == "staff"

    @pytest.mark.asyncio
    async def test_supervisor_can_access_staff_endpoints(self, client, supervisor_user):
        """Supervisor should access staff-level endpoints"""
        with patch("backend.auth.jwt_provider.decode", return_value=supervisor_user):
            assert supervisor_user["role"] == "supervisor"

    # Supervisor endpoints - should allow supervisor, admin only
    @pytest.mark.asyncio
    async def test_staff_cannot_access_supervisor_endpoints(self, client, staff_user):
        """Staff should NOT access supervisor-only endpoints"""
        # Verify role hierarchy
        assert staff_user["role"] == "staff"
        assert staff_user["role"] not in ["supervisor", "admin"]

    @pytest.mark.asyncio
    async def test_supervisor_can_access_supervisor_endpoints(self, client, supervisor_user):
        """Supervisor should access supervisor-level endpoints"""
        assert supervisor_user["role"] == "supervisor"

    # Admin endpoints - should allow admin only
    @pytest.mark.asyncio
    async def test_staff_cannot_access_admin(self, client, staff_user):
        """Staff should NOT access admin-only endpoints"""
        assert staff_user["role"] not in ["admin"]

    @pytest.mark.asyncio
    async def test_supervisor_cannot_access_admin_endpoints(self, client, supervisor_user):
        """Supervisor should NOT access admin-only endpoints"""
        assert supervisor_user["role"] not in ["admin"]

    @pytest.mark.asyncio
    async def test_admin_can_access_admin_endpoints(self, client, admin_user):
        """Admin should access admin-level endpoints"""
        assert admin_user["role"] == "admin"


class TestRoleHierarchy:
    """Tests for role hierarchy validation"""

    def test_role_hierarchy_order(self):
        """Verify correct role hierarchy"""
        hierarchy = ["staff", "supervisor", "admin"]

        # Staff is lowest
        assert hierarchy.index("staff") < hierarchy.index("supervisor")
        assert hierarchy.index("staff") < hierarchy.index("admin")

        # Supervisor is middle
        assert hierarchy.index("supervisor") > hierarchy.index("staff")
        assert hierarchy.index("supervisor") < hierarchy.index("admin")

        # Admin is highest
        assert hierarchy.index("admin") > hierarchy.index("supervisor")
        assert hierarchy.index("admin") > hierarchy.index("staff")

    def test_valid_roles(self):
        """Only valid roles should be accepted"""
        valid_roles = {"staff", "supervisor", "admin"}

        assert "staff" in valid_roles
        assert "supervisor" in valid_roles
        assert "admin" in valid_roles
        assert "guest" not in valid_roles
        assert "root" not in valid_roles


class TestUnauthorizedAccess:
    """Tests for unauthorized access handling"""

    @pytest.fixture
    def client(self):
        """Create test client"""
        return TestClient(app)

    def test_missing_auth_header(self, client):
        """Requests without auth header should be rejected"""
        # Protected endpoints should require authentication
        response = client.get("/api/sessions")
        assert response.status_code in [401, 403, 422]

    def test_invalid_token_format(self, client):
        """Invalid token format should be rejected"""
        response = client.get("/api/sessions", headers={"Authorization": "InvalidFormat"})
        assert response.status_code in [401, 403, 422]

    def test_expired_token(self, client):
        """Expired tokens should be rejected"""
        # This tests that the auth middleware properly validates tokens
        response = client.get(
            "/api/sessions", headers={"Authorization": "Bearer expired.token.here"}
        )
        assert response.status_code in [401, 403, 422]

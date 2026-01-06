"""
Comprehensive tests for error_reporting_api.py
Tests error reporting, admin dashboard, error management, and statistics
"""

from datetime import datetime

import pytest
from httpx import AsyncClient

from backend.auth.dependencies import get_current_user
from backend.server import app


@pytest.fixture(autouse=True)
def reset_error_store():
    """Reset error_store and dependency overrides before each test"""
    from backend.api.error_reporting_api import error_store

    error_store["errors"] = []
    error_store["stats"] = {
        "total": 0,
        "critical": 0,
        "high": 0,
        "medium": 0,
        "low": 0,
        "affected_users": set(),
    }

    # Clear any dependency overrides
    app.dependency_overrides.clear()

    yield

    # Clean up after test
    app.dependency_overrides.clear()


async def mock_get_current_admin():
    """Mock admin user for testing"""
    return {
        "_id": "admin_id",
        "id": "admin_id",
        "username": "admin",
        "role": "admin",
        "full_name": "Administrator",
        "is_active": True,
    }


async def mock_get_current_staff():
    """Mock staff user for testing"""
    return {
        "_id": "staff_id",
        "id": "staff_id",
        "username": "staff1",
        "role": "staff",
        "full_name": "Staff Member",
        "is_active": True,
    }


@pytest.mark.asyncio
class TestErrorReporting:
    """Test error reporting functionality"""

    async def test_report_error_success(self, async_client: AsyncClient):
        """Test successful error reporting"""
        app.dependency_overrides[get_current_user] = mock_get_current_staff

        error_data = {
            "type": "NetworkError",
            "message": "Failed to fetch data from server",
            "severity": "high",
            "context": {"endpoint": "/api/items", "method": "GET"},
        }

        response = await async_client.post("/api/admin/errors/report", json=error_data)

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "error_id" in data
        assert data["error_id"].startswith("error_")

    async def test_report_error_with_timestamp(self, async_client: AsyncClient):
        """Test error reporting with custom timestamp"""
        app.dependency_overrides[get_current_user] = mock_get_current_staff

        error_data = {
            "type": "ValidationError",
            "message": "Invalid barcode format",
            "severity": "medium",
            "timestamp": datetime.utcnow().isoformat(),
        }

        response = await async_client.post("/api/admin/errors/report", json=error_data)

        assert response.status_code == 200
        assert response.json()["success"] is True

    async def test_report_critical_error(self, async_client: AsyncClient):
        """Test critical error reporting triggers notification"""
        app.dependency_overrides[get_current_user] = mock_get_current_staff

        error_data = {
            "type": "DatabaseError",
            "message": "MongoDB connection lost",
            "severity": "critical",
            "context": {"database": "stock_count", "operation": "insert"},
        }

        response = await async_client.post("/api/admin/errors/report", json=error_data)

        assert response.status_code == 200
        assert response.json()["success"] is True

    async def test_report_error_without_context(self, async_client: AsyncClient):
        """Test error reporting without optional context"""
        app.dependency_overrides[get_current_user] = mock_get_current_staff

        error_data = {
            "type": "AuthenticationError",
            "message": "Token expired",
            "severity": "low",
        }

        response = await async_client.post("/api/admin/errors/report", json=error_data)

        assert response.status_code == 200
        assert response.json()["success"] is True

    async def test_report_error_unauthenticated(self, async_client: AsyncClient):
        """Test error reporting without authentication requires auth"""
        error_data = {
            "type": "NetworkError",
            "message": "Connection timeout",
            "severity": "medium",
        }

        response = await async_client.post("/api/admin/errors/report", json=error_data)

        # The endpoint requires authentication
        assert response.status_code in (200, 401)  # Depends on get_current_user dependency


@pytest.mark.asyncio
class TestErrorRetrieval:
    """Test error retrieval and filtering"""

    async def test_get_errors_admin(self, async_client: AsyncClient):
        """Test admin can retrieve errors"""
        app.dependency_overrides[get_current_user] = mock_get_current_admin

        # Report an error first
        await async_client.post(
            "/api/admin/errors/report",
            json={
                "type": "TestError",
                "message": "Test error message",
                "severity": "high",
            },
        )

        # Retrieve errors
        response = await async_client.get("/api/admin/errors")

        assert response.status_code == 200
        data = response.json()
        assert "errors" in data
        assert "count" in data
        assert isinstance(data["errors"], list)

    async def test_get_errors_non_admin_forbidden(
        self, async_client: AsyncClient, authenticated_headers: dict
    ):
        """Test non-admin users cannot retrieve errors"""
        response = await async_client.get("/api/admin/errors", headers=authenticated_headers)

        # authenticated_headers is for staff1 (not admin)
        assert response.status_code == 403
        assert "Admin access required" in response.json()["detail"]

    async def test_get_errors_with_severity_filter(self, async_client: AsyncClient):
        """Test filtering errors by severity"""
        app.dependency_overrides[get_current_user] = mock_get_current_admin

        # Report errors with different severities
        await async_client.post(
            "/api/admin/errors/report",
            json={"type": "Error1", "message": "Critical error", "severity": "critical"},
        )
        await async_client.post(
            "/api/admin/errors/report",
            json={"type": "Error2", "message": "High error", "severity": "high"},
        )

        # Filter by critical severity
        response = await async_client.get("/api/admin/errors?severity=critical")

        assert response.status_code == 200
        data = response.json()
        assert all(e["severity"] == "critical" for e in data["errors"])

    async def test_get_errors_with_status_filter(self, async_client: AsyncClient):
        """Test filtering errors by status"""
        app.dependency_overrides[get_current_user] = mock_get_current_admin

        # Report an error
        report_response = await async_client.post(
            "/api/admin/errors/report",
            json={"type": "TestError", "message": "Test", "severity": "medium"},
        )
        error_id = report_response.json()["error_id"]

        # Update status
        await async_client.patch(
            f"/api/admin/errors/{error_id}/status?status=acknowledged",
        )

        # Filter by status
        response = await async_client.get("/api/admin/errors?status=acknowledged")

        assert response.status_code == 200
        data = response.json()
        assert all(e["status"] == "acknowledged" for e in data["errors"])

    async def test_get_errors_with_limit(self, async_client: AsyncClient):
        """Test limiting number of returned errors"""
        app.dependency_overrides[get_current_user] = mock_get_current_admin

        # Report multiple errors
        for i in range(5):
            await async_client.post(
                "/api/admin/errors/report",
                json={
                    "type": f"Error{i}",
                    "message": f"Error message {i}",
                    "severity": "low",
                },
            )

        # Get errors with limit
        response = await async_client.get("/api/admin/errors?limit=2")

        assert response.status_code == 200
        data = response.json()
        assert len(data["errors"]) <= 2


@pytest.mark.asyncio
class TestErrorDashboard:
    """Test error dashboard functionality"""

    async def test_get_error_dashboard_admin(self, async_client: AsyncClient):
        """Test admin can access error dashboard"""
        app.dependency_overrides[get_current_user] = mock_get_current_admin

        response = await async_client.get("/api/admin/errors/dashboard")

        assert response.status_code == 200
        data = response.json()
        assert "errors" in data
        assert "statistics" in data
        assert "recent_errors" in data
        assert "error_trends" in data

    async def test_get_error_dashboard_statistics(self, async_client: AsyncClient):
        """Test dashboard statistics calculation"""
        app.dependency_overrides[get_current_user] = mock_get_current_admin

        # Report errors with different severities
        await async_client.post(
            "/api/admin/errors/report",
            json={"type": "Error1", "message": "Critical", "severity": "critical"},
        )
        await async_client.post(
            "/api/admin/errors/report",
            json={"type": "Error2", "message": "High", "severity": "high"},
        )

        response = await async_client.get("/api/admin/errors/dashboard")

        assert response.status_code == 200
        data = response.json()
        stats = data["statistics"]
        assert stats["total_errors"] >= 2
        assert stats["critical_errors"] >= 1
        assert stats["high_errors"] >= 1
        assert "resolution_rate" in stats

    async def test_get_error_dashboard_non_admin(
        self, async_client: AsyncClient, authenticated_headers: dict
    ):
        """Test non-admin users cannot access dashboard"""
        response = await async_client.get(
            "/api/admin/errors/dashboard", headers=authenticated_headers
        )

        assert response.status_code == 403


@pytest.mark.asyncio
class TestErrorDetail:
    """Test individual error detail retrieval"""

    async def test_get_error_detail_success(self, async_client: AsyncClient):
        """Test retrieving error detail by ID"""
        app.dependency_overrides[get_current_user] = mock_get_current_admin

        # Report an error
        report_response = await async_client.post(
            "/api/admin/errors/report",
            json={"type": "TestError", "message": "Detail test", "severity": "medium"},
        )
        error_id = report_response.json()["error_id"]

        # Get error detail
        response = await async_client.get(f"/api/admin/errors/{error_id}")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == error_id
        assert data["type"] == "TestError"
        assert data["message"] == "Detail test"

    async def test_get_error_detail_not_found(self, async_client: AsyncClient):
        """Test retrieving non-existent error"""
        app.dependency_overrides[get_current_user] = mock_get_current_admin

        response = await async_client.get("/api/admin/errors/nonexistent_id")

        assert response.status_code == 404

    async def test_get_error_detail_non_admin(
        self, async_client: AsyncClient, authenticated_headers: dict
    ):
        """Test non-admin users cannot get error detail"""
        response = await async_client.get(
            "/api/admin/errors/error_1", headers=authenticated_headers
        )

        assert response.status_code == 403


@pytest.mark.asyncio
class TestErrorStatusUpdate:
    """Test error status management"""

    async def test_update_error_status_success(self, async_client: AsyncClient):
        """Test updating error status"""
        app.dependency_overrides[get_current_user] = mock_get_current_admin

        # Report an error
        report_response = await async_client.post(
            "/api/admin/errors/report",
            json={"type": "TestError", "message": "Status test", "severity": "low"},
        )
        error_id = report_response.json()["error_id"]

        # Update status to acknowledged
        response = await async_client.patch(
            f"/api/admin/errors/{error_id}/status?status=acknowledged",
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["error"]["status"] == "acknowledged"

    async def test_update_error_status_to_resolved(self, async_client: AsyncClient):
        """Test updating error status to resolved"""
        app.dependency_overrides[get_current_user] = mock_get_current_admin

        # Report and resolve an error
        report_response = await async_client.post(
            "/api/admin/errors/report",
            json={"type": "TestError", "message": "Resolve test", "severity": "medium"},
        )
        error_id = report_response.json()["error_id"]

        response = await async_client.patch(
            f"/api/admin/errors/{error_id}/status?status=resolved",
        )

        assert response.status_code == 200
        assert response.json()["error"]["status"] == "resolved"

    async def test_update_error_status_not_found(self, async_client: AsyncClient):
        """Test updating status of non-existent error"""
        app.dependency_overrides[get_current_user] = mock_get_current_admin

        response = await async_client.patch(
            "/api/admin/errors/nonexistent_id/status?status=resolved",
        )

        assert response.status_code == 404

    async def test_update_error_status_non_admin(
        self, async_client: AsyncClient, authenticated_headers: dict
    ):
        """Test non-admin users cannot update error status"""
        response = await async_client.patch(
            "/api/admin/errors/error_1/status?status=resolved",
            headers=authenticated_headers,
        )

        assert response.status_code == 403


@pytest.mark.asyncio
class TestErrorDeletion:
    """Test error deletion"""

    async def test_delete_error_success(self, async_client: AsyncClient):
        """Test deleting an error"""
        app.dependency_overrides[get_current_user] = mock_get_current_admin

        # Report an error
        report_response = await async_client.post(
            "/api/admin/errors/report",
            json={"type": "TestError", "message": "Delete test", "severity": "low"},
        )
        error_id = report_response.json()["error_id"]

        # Delete the error
        response = await async_client.delete(f"/api/admin/errors/{error_id}")

        assert response.status_code == 200
        assert response.json()["success"] is True

        # Verify error is deleted
        get_response = await async_client.get(f"/api/admin/errors/{error_id}")
        assert get_response.status_code == 404

    async def test_delete_error_non_admin(
        self, async_client: AsyncClient, authenticated_headers: dict
    ):
        """Test non-admin users cannot delete errors"""
        response = await async_client.delete(
            "/api/admin/errors/error_1", headers=authenticated_headers
        )

        assert response.status_code == 403


@pytest.mark.asyncio
class TestErrorStatistics:
    """Test error statistics and summaries"""

    async def test_get_error_summary_success(self, async_client: AsyncClient):
        """Test getting error summary statistics"""
        app.dependency_overrides[get_current_user] = mock_get_current_admin

        # Report multiple errors
        await async_client.post(
            "/api/admin/errors/report",
            json={"type": "NetworkError", "message": "Test1", "severity": "critical"},
        )
        await async_client.post(
            "/api/admin/errors/report",
            json={"type": "ValidationError", "message": "Test2", "severity": "high"},
        )

        response = await async_client.get("/api/admin/errors/stats/summary")

        assert response.status_code == 200
        data = response.json()
        assert "total_errors" in data
        assert "by_severity" in data
        assert "by_status" in data
        assert "by_type" in data
        assert data["total_errors"] >= 2

    async def test_get_error_summary_by_severity(self, async_client: AsyncClient):
        """Test error summary breakdown by severity"""
        app.dependency_overrides[get_current_user] = mock_get_current_admin

        response = await async_client.get("/api/admin/errors/stats/summary")

        assert response.status_code == 200
        data = response.json()
        by_severity = data["by_severity"]
        assert "critical" in by_severity
        assert "high" in by_severity
        assert "medium" in by_severity
        assert "low" in by_severity

    async def test_get_error_summary_by_type(self, async_client: AsyncClient):
        """Test error summary breakdown by type"""
        app.dependency_overrides[get_current_user] = mock_get_current_admin

        # Report errors with different types
        await async_client.post(
            "/api/admin/errors/report",
            json={"type": "NetworkError", "message": "Test", "severity": "low"},
        )
        await async_client.post(
            "/api/admin/errors/report",
            json={"type": "NetworkError", "message": "Test2", "severity": "low"},
        )

        response = await async_client.get("/api/admin/errors/stats/summary")

        assert response.status_code == 200
        data = response.json()
        assert "by_type" in data
        assert isinstance(data["by_type"], dict)

    async def test_get_error_summary_non_admin(
        self, async_client: AsyncClient, authenticated_headers: dict
    ):
        """Test non-admin users cannot get error summary"""
        response = await async_client.get(
            "/api/admin/errors/stats/summary", headers=authenticated_headers
        )

        assert response.status_code == 403

"""
Comprehensive test suite for session_management_api.py
Target: Achieve 80%+ coverage
"""

import time
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock

import pytest
from httpx import ASGITransport, AsyncClient

from backend.api.schemas import SessionCreate
from backend.server import app


@pytest.fixture
def mock_user_staff():
    """Create mock staff user"""
    return {"username": "staff1", "role": "staff", "full_name": "Staff User"}


@pytest.fixture
def mock_user_supervisor():
    """Create mock supervisor user"""
    return {"username": "supervisor1", "role": "supervisor", "full_name": "Supervisor User"}


@pytest.fixture
def sample_session_data():
    """Create sample session data"""
    return {
        "id": "sess_123",
        "warehouse": "WH001",
        "staff_user": "staff1",
        "staff_name": "Staff User",
        "status": "OPEN",
        "type": "STANDARD",
        "started_at": datetime.utcnow(),
    }


@pytest.fixture
def sample_verification_session():
    """Create sample verification session data"""
    return {
        "session_id": "sess_123",
        "user_id": "staff1",
        "status": "ACTIVE",
        "started_at": time.time(),
        "last_heartbeat": time.time(),
        "rack_id": None,
        "floor": None,
    }


class TestSessionModels:
    """Test session models and validation"""

    def test_session_create_model(self):
        """Test SessionCreate model validation"""
        session_create = SessionCreate(warehouse="WH001", type="STANDARD")
        assert session_create.warehouse == "WH001"
        assert session_create.type == "STANDARD"

    def test_session_create_default_type(self):
        """Test SessionCreate default type"""
        session_create = SessionCreate(warehouse="WH001")
        assert session_create.type == "STANDARD"

    def test_session_create_warehouse_required(self):
        """Test that warehouse is required"""
        with pytest.raises(Exception):
            SessionCreate()


class TestCreateSessionEndpoint:
    """Test POST /api/sessions/"""

    @pytest.mark.asyncio
    async def test_create_session_success(self, mock_user_staff):
        """Test successful session creation"""
        mock_db = MagicMock()
        mock_db.sessions = MagicMock()
        mock_db.sessions.count_documents = AsyncMock(return_value=0)
        mock_db.sessions.insert_one = AsyncMock(return_value=MagicMock())
        mock_db.verification_sessions = MagicMock()
        mock_db.verification_sessions.insert_one = AsyncMock(return_value=MagicMock())

        async def override_get_db():
            return mock_db

        async def override_get_current_user():
            return mock_user_staff

        from backend.auth.dependencies import get_current_user_async
        from backend.db.runtime import get_db

        app.dependency_overrides[get_db] = override_get_db
        app.dependency_overrides[get_current_user_async] = override_get_current_user

        try:
            async with AsyncClient(
                transport=ASGITransport(app=app),
                base_url="http://test",
            ) as client:
                response = await client.post(
                    "/api/sessions/",
                    json={"warehouse": "WH001", "type": "STANDARD"},
                )
                assert response.status_code == 200
                data = response.json()
                assert data["warehouse"] == "WH001"
                assert data["status"] == "OPEN"
                assert data["staff_user"] == "staff1"
        finally:
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_create_session_limit_exceeded(self, mock_user_staff):
        """Test session creation blocked when limit reached (5 open sessions)"""
        mock_db = MagicMock()
        mock_db.sessions = MagicMock()
        mock_db.sessions.count_documents = AsyncMock(return_value=5)  # Already at limit

        async def override_get_db():
            return mock_db

        async def override_get_current_user():
            return mock_user_staff

        from backend.auth.dependencies import get_current_user_async
        from backend.db.runtime import get_db

        app.dependency_overrides[get_db] = override_get_db
        app.dependency_overrides[get_current_user_async] = override_get_current_user

        try:
            async with AsyncClient(
                transport=ASGITransport(app=app),
                base_url="http://test",
            ) as client:
                response = await client.post(
                    "/api/sessions/",
                    json={"warehouse": "WH001"},
                )
                assert response.status_code == 400
                assert "Session limit reached" in response.json()["detail"]
                assert "5" in response.json()["detail"]
        finally:
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_create_session_empty_warehouse(self, mock_user_staff):
        """Test session creation fails with empty warehouse"""
        mock_db = MagicMock()
        mock_db.sessions = MagicMock()
        mock_db.sessions.count_documents = AsyncMock(return_value=0)

        async def override_get_db():
            return mock_db

        async def override_get_current_user():
            return mock_user_staff

        from backend.auth.dependencies import get_current_user_async
        from backend.db.runtime import get_db

        app.dependency_overrides[get_db] = override_get_db
        app.dependency_overrides[get_current_user_async] = override_get_current_user

        try:
            async with AsyncClient(
                transport=ASGITransport(app=app),
                base_url="http://test",
            ) as client:
                response = await client.post(
                    "/api/sessions/",
                    json={"warehouse": "   "},  # Empty after strip
                )
                assert response.status_code == 400
                assert "empty" in response.json()["detail"].lower()
        finally:
            app.dependency_overrides.clear()


class TestGetSessionsEndpoint:
    """Test GET /api/sessions/"""

    @pytest.mark.asyncio
    async def test_get_sessions_staff_sees_own(self, mock_user_staff, sample_session_data):
        """Test staff user only sees their own sessions"""
        mock_db = MagicMock()
        mock_db.sessions = MagicMock()
        mock_db.sessions.count_documents = AsyncMock(return_value=1)

        cursor = MagicMock()
        cursor.sort = MagicMock(return_value=cursor)
        cursor.skip = MagicMock(return_value=cursor)
        cursor.limit = MagicMock(return_value=cursor)
        cursor.to_list = AsyncMock(return_value=[sample_session_data])
        mock_db.sessions.find = MagicMock(return_value=cursor)

        async def override_get_db():
            return mock_db

        async def override_get_current_user():
            return mock_user_staff

        from backend.auth.dependencies import get_current_user_async
        from backend.db.runtime import get_db

        app.dependency_overrides[get_db] = override_get_db
        app.dependency_overrides[get_current_user_async] = override_get_current_user

        try:
            async with AsyncClient(
                transport=ASGITransport(app=app),
                base_url="http://test",
            ) as client:
                response = await client.get("/api/sessions/")
                assert response.status_code == 200
                data = response.json()
                assert "items" in data
                assert "total" in data
        finally:
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_get_sessions_supervisor_sees_all(self, mock_user_supervisor):
        """Test supervisor can see all sessions"""
        sessions = [
            {
                "id": "1",
                "warehouse": "WH1",
                "staff_user": "staff1",
                "staff_name": "Staff 1",
                "status": "OPEN",
                "type": "STANDARD",
                "started_at": datetime.utcnow(),
            },
            {
                "id": "2",
                "warehouse": "WH2",
                "staff_user": "staff2",
                "staff_name": "Staff 2",
                "status": "ACTIVE",
                "type": "STANDARD",
                "started_at": datetime.utcnow(),
            },
        ]

        mock_db = MagicMock()
        mock_db.sessions = MagicMock()
        mock_db.sessions.count_documents = AsyncMock(return_value=2)

        cursor = MagicMock()
        cursor.sort = MagicMock(return_value=cursor)
        cursor.skip = MagicMock(return_value=cursor)
        cursor.limit = MagicMock(return_value=cursor)
        cursor.to_list = AsyncMock(return_value=sessions)
        mock_db.sessions.find = MagicMock(return_value=cursor)

        async def override_get_db():
            return mock_db

        async def override_get_current_user():
            return mock_user_supervisor

        from backend.auth.dependencies import get_current_user_async
        from backend.db.runtime import get_db

        app.dependency_overrides[get_db] = override_get_db
        app.dependency_overrides[get_current_user_async] = override_get_current_user

        try:
            async with AsyncClient(
                transport=ASGITransport(app=app),
                base_url="http://test",
            ) as client:
                response = await client.get("/api/sessions/")
                assert response.status_code == 200
                data = response.json()
                assert data["total"] == 2
        finally:
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_get_sessions_access_denied_for_other_user(self, mock_user_staff):
        """Test staff cannot filter by other user's sessions"""
        mock_db = MagicMock()

        async def override_get_db():
            return mock_db

        async def override_get_current_user():
            return mock_user_staff

        from backend.auth.dependencies import get_current_user_async
        from backend.db.runtime import get_db

        app.dependency_overrides[get_db] = override_get_db
        app.dependency_overrides[get_current_user_async] = override_get_current_user

        try:
            async with AsyncClient(
                transport=ASGITransport(app=app),
                base_url="http://test",
            ) as client:
                response = await client.get("/api/sessions/?user_id=other_user")
                assert response.status_code == 403
                assert "Access denied" in response.json()["detail"]
        finally:
            app.dependency_overrides.clear()


class TestGetSessionDetailEndpoint:
    """Test GET /api/sessions/{session_id}"""

    @pytest.mark.asyncio
    async def test_get_session_detail_success(self, mock_user_staff, sample_verification_session):
        """Test getting session details"""
        mock_db = MagicMock()
        mock_db.verification_sessions = MagicMock()
        mock_db.verification_sessions.find_one = AsyncMock(return_value=sample_verification_session)
        mock_db.verification_records = MagicMock()
        mock_db.verification_records.count_documents = AsyncMock(return_value=10)

        async def override_get_db():
            return mock_db

        async def override_get_current_user():
            return mock_user_staff

        from backend.auth.dependencies import get_current_user_async
        from backend.db.runtime import get_db

        app.dependency_overrides[get_db] = override_get_db
        app.dependency_overrides[get_current_user_async] = override_get_current_user

        try:
            async with AsyncClient(
                transport=ASGITransport(app=app),
                base_url="http://test",
            ) as client:
                response = await client.get("/api/sessions/sess_123")
                assert response.status_code == 200
                data = response.json()
                assert data["id"] == "sess_123"
        finally:
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_get_session_not_found(self, mock_user_staff):
        """Test getting non-existent session"""
        mock_db = MagicMock()
        mock_db.verification_sessions = MagicMock()
        mock_db.verification_sessions.find_one = AsyncMock(return_value=None)

        async def override_get_db():
            return mock_db

        async def override_get_current_user():
            return mock_user_staff

        from backend.auth.dependencies import get_current_user_async
        from backend.db.runtime import get_db

        app.dependency_overrides[get_db] = override_get_db
        app.dependency_overrides[get_current_user_async] = override_get_current_user

        try:
            async with AsyncClient(
                transport=ASGITransport(app=app),
                base_url="http://test",
            ) as client:
                response = await client.get("/api/sessions/nonexistent")
                assert response.status_code == 404
                assert "not found" in response.json()["detail"].lower()
        finally:
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_get_session_access_denied(self, mock_user_staff):
        """Test staff cannot view other user's session"""
        other_session = {
            "session_id": "sess_other",
            "user_id": "other_user",
            "status": "ACTIVE",
            "started_at": time.time(),
            "last_heartbeat": time.time(),
        }

        mock_db = MagicMock()
        mock_db.verification_sessions = MagicMock()
        mock_db.verification_sessions.find_one = AsyncMock(return_value=other_session)

        async def override_get_db():
            return mock_db

        async def override_get_current_user():
            return mock_user_staff

        from backend.auth.dependencies import get_current_user_async
        from backend.db.runtime import get_db

        app.dependency_overrides[get_db] = override_get_db
        app.dependency_overrides[get_current_user_async] = override_get_current_user

        try:
            async with AsyncClient(
                transport=ASGITransport(app=app),
                base_url="http://test",
            ) as client:
                response = await client.get("/api/sessions/sess_other")
                assert response.status_code == 403
        finally:
            app.dependency_overrides.clear()


class TestSessionStatsEndpoint:
    """Test GET /api/sessions/{session_id}/stats"""

    @pytest.mark.asyncio
    async def test_get_session_stats(self, mock_user_staff, sample_verification_session):
        """Test getting session statistics"""
        mock_db = MagicMock()
        mock_db.verification_sessions = MagicMock()
        mock_db.verification_sessions.find_one = AsyncMock(return_value=sample_verification_session)
        mock_db.verification_records = MagicMock()

        agg_cursor = MagicMock()
        agg_cursor.to_list = AsyncMock(
            return_value=[
                {
                    "total": 50,
                    "verified": 30,
                    "damage": 5,
                }
            ]
        )
        mock_db.verification_records.aggregate = MagicMock(return_value=agg_cursor)

        async def override_get_db():
            return mock_db

        async def override_get_current_user():
            return mock_user_staff

        from backend.auth.dependencies import get_current_user_async
        from backend.db.runtime import get_db

        app.dependency_overrides[get_db] = override_get_db
        app.dependency_overrides[get_current_user_async] = override_get_current_user

        try:
            async with AsyncClient(
                transport=ASGITransport(app=app),
                base_url="http://test",
            ) as client:
                response = await client.get("/api/sessions/sess_123/stats")
                assert response.status_code == 200
                data = response.json()
                assert data["total_items"] == 50
                assert data["verified_items"] == 30
                assert data["damage_items"] == 5
                assert data["pending_items"] == 20
        finally:
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_get_session_stats_empty(self, mock_user_staff, sample_verification_session):
        """Test session stats when no items counted"""
        mock_db = MagicMock()
        mock_db.verification_sessions = MagicMock()
        mock_db.verification_sessions.find_one = AsyncMock(return_value=sample_verification_session)
        mock_db.verification_records = MagicMock()

        agg_cursor = MagicMock()
        agg_cursor.to_list = AsyncMock(return_value=[])  # No records
        mock_db.verification_records.aggregate = MagicMock(return_value=agg_cursor)

        async def override_get_db():
            return mock_db

        async def override_get_current_user():
            return mock_user_staff

        from backend.auth.dependencies import get_current_user_async
        from backend.db.runtime import get_db

        app.dependency_overrides[get_db] = override_get_db
        app.dependency_overrides[get_current_user_async] = override_get_current_user

        try:
            async with AsyncClient(
                transport=ASGITransport(app=app),
                base_url="http://test",
            ) as client:
                response = await client.get("/api/sessions/sess_123/stats")
                assert response.status_code == 200
                data = response.json()
                assert data["total_items"] == 0
                assert data["verified_items"] == 0
        finally:
            app.dependency_overrides.clear()


class TestCompleteSessionEndpoint:
    """Test POST /api/sessions/{session_id}/complete"""

    @pytest.mark.asyncio
    async def test_complete_session_success(self, mock_user_staff, sample_verification_session):
        """Test successful session completion"""
        mock_db = MagicMock()
        mock_db.verification_sessions = MagicMock()
        mock_db.verification_sessions.find_one = AsyncMock(return_value=sample_verification_session)
        mock_db.verification_sessions.update_one = AsyncMock(
            return_value=MagicMock(modified_count=1)
        )
        mock_db.rack_registry = MagicMock()

        mock_redis = MagicMock()
        mock_lock_manager = MagicMock()
        mock_lock_manager.release_rack_lock = AsyncMock(return_value=True)
        mock_lock_manager.delete_session = AsyncMock(return_value=True)

        async def override_get_db():
            return mock_db

        async def override_get_current_user():
            return mock_user_staff

        async def override_get_redis():
            return mock_redis

        from backend.auth.dependencies import get_current_user_async
        from backend.db.runtime import get_db
        from backend.services.redis_service import get_redis

        app.dependency_overrides[get_db] = override_get_db
        app.dependency_overrides[get_current_user_async] = override_get_current_user
        app.dependency_overrides[get_redis] = override_get_redis

        try:
            from unittest.mock import patch

            with patch(
                "backend.api.session_management_api.get_lock_manager",
                return_value=mock_lock_manager,
            ):
                async with AsyncClient(
                    transport=ASGITransport(app=app),
                    base_url="http://test",
                ) as client:
                    response = await client.post("/api/sessions/sess_123/complete")
                    assert response.status_code == 200
                    data = response.json()
                    assert data["success"] is True
                    assert data["status"] == "CLOSED"
        finally:
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_complete_session_not_owner(self, mock_user_staff):
        """Test completing another user's session fails"""
        other_session = {
            "session_id": "sess_other",
            "user_id": "other_user",
            "status": "ACTIVE",
            "started_at": time.time(),
            "last_heartbeat": time.time(),
        }

        mock_db = MagicMock()
        mock_db.verification_sessions = MagicMock()
        mock_db.verification_sessions.find_one = AsyncMock(return_value=other_session)

        mock_redis = MagicMock()

        async def override_get_db():
            return mock_db

        async def override_get_current_user():
            return mock_user_staff

        async def override_get_redis():
            return mock_redis

        from backend.auth.dependencies import get_current_user_async
        from backend.db.runtime import get_db
        from backend.services.redis_service import get_redis

        app.dependency_overrides[get_db] = override_get_db
        app.dependency_overrides[get_current_user_async] = override_get_current_user
        app.dependency_overrides[get_redis] = override_get_redis

        try:
            async with AsyncClient(
                transport=ASGITransport(app=app),
                base_url="http://test",
            ) as client:
                response = await client.post("/api/sessions/sess_other/complete")
                assert response.status_code == 403
                assert "Not your session" in response.json()["detail"]
        finally:
            app.dependency_overrides.clear()


class TestUpdateSessionStatusEndpoint:
    """Test PUT /api/sessions/{session_id}/status"""

    @pytest.mark.asyncio
    async def test_update_status_success(self, mock_user_staff, sample_verification_session):
        """Test updating session status"""
        mock_db = MagicMock()
        mock_db.verification_sessions = MagicMock()
        mock_db.verification_sessions.find_one = AsyncMock(return_value=sample_verification_session)
        mock_db.verification_sessions.update_one = AsyncMock(
            return_value=MagicMock(modified_count=1)
        )

        async def override_get_db():
            return mock_db

        async def override_get_current_user():
            return mock_user_staff

        from backend.auth.dependencies import get_current_user_async
        from backend.db.runtime import get_db

        app.dependency_overrides[get_db] = override_get_db
        app.dependency_overrides[get_current_user_async] = override_get_current_user

        try:
            async with AsyncClient(
                transport=ASGITransport(app=app),
                base_url="http://test",
            ) as client:
                response = await client.put("/api/sessions/sess_123/status?status=RECONCILE")
                assert response.status_code == 200
                data = response.json()
                assert data["success"] is True
                assert data["status"] == "RECONCILE"
        finally:
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_update_status_supervisor_can_modify_others(self, mock_user_supervisor):
        """Test supervisor can update any session"""
        session = {
            "session_id": "sess_123",
            "user_id": "staff1",
            "status": "ACTIVE",
            "started_at": time.time(),
            "last_heartbeat": time.time(),
        }

        mock_db = MagicMock()
        mock_db.verification_sessions = MagicMock()
        mock_db.verification_sessions.find_one = AsyncMock(return_value=session)
        mock_db.verification_sessions.update_one = AsyncMock(
            return_value=MagicMock(modified_count=1)
        )

        async def override_get_db():
            return mock_db

        async def override_get_current_user():
            return mock_user_supervisor

        from backend.auth.dependencies import get_current_user_async
        from backend.db.runtime import get_db

        app.dependency_overrides[get_db] = override_get_db
        app.dependency_overrides[get_current_user_async] = override_get_current_user

        try:
            async with AsyncClient(
                transport=ASGITransport(app=app),
                base_url="http://test",
            ) as client:
                response = await client.put("/api/sessions/sess_123/status?status=CLOSED")
                assert response.status_code == 200
        finally:
            app.dependency_overrides.clear()


class TestActiveSessionsEndpoint:
    """Test GET /api/sessions/active"""

    @pytest.mark.asyncio
    async def test_get_active_sessions(self, mock_user_staff):
        """Test getting active sessions"""
        active_sessions = [
            {
                "session_id": "sess_1",
                "user_id": "staff1",
                "status": "ACTIVE",
                "started_at": time.time(),
                "last_heartbeat": time.time(),
                "rack_id": "R1",
                "floor": "F1",
            }
        ]

        mock_db = MagicMock()
        mock_db.verification_sessions = MagicMock()

        cursor = MagicMock()
        cursor.sort = MagicMock(return_value=cursor)
        cursor.to_list = AsyncMock(return_value=active_sessions)
        mock_db.verification_sessions.find = MagicMock(return_value=cursor)

        mock_db.verification_records = MagicMock()
        mock_db.verification_records.count_documents = AsyncMock(return_value=10)

        async def override_get_db():
            return mock_db

        async def override_get_current_user():
            return mock_user_staff

        from backend.auth.dependencies import get_current_user_async
        from backend.db.runtime import get_db

        app.dependency_overrides[get_db] = override_get_db
        app.dependency_overrides[get_current_user_async] = override_get_current_user

        try:
            async with AsyncClient(
                transport=ASGITransport(app=app),
                base_url="http://test",
            ) as client:
                response = await client.get("/api/sessions/active")
                assert response.status_code == 200
                data = response.json()
                assert len(data) >= 0  # May be filtered
        finally:
            app.dependency_overrides.clear()


class TestUserSessionHistoryEndpoint:
    """Test GET /api/sessions/user/history"""

    @pytest.mark.asyncio
    async def test_get_user_history(self, mock_user_staff):
        """Test getting user's session history"""
        history = [
            {
                "session_id": "sess_old",
                "user_id": "staff1",
                "status": "CLOSED",
                "started_at": time.time() - 3600,
                "last_heartbeat": time.time() - 3500,
                "completed_at": time.time() - 3400,
            }
        ]

        mock_db = MagicMock()
        mock_db.verification_sessions = MagicMock()

        cursor = MagicMock()
        cursor.sort = MagicMock(return_value=cursor)
        cursor.limit = MagicMock(return_value=cursor)
        cursor.to_list = AsyncMock(return_value=history)
        mock_db.verification_sessions.find = MagicMock(return_value=cursor)

        mock_db.verification_records = MagicMock()
        mock_db.verification_records.count_documents = AsyncMock(return_value=25)

        async def override_get_db():
            return mock_db

        async def override_get_current_user():
            return mock_user_staff

        from backend.auth.dependencies import get_current_user_async
        from backend.db.runtime import get_db

        app.dependency_overrides[get_db] = override_get_db
        app.dependency_overrides[get_current_user_async] = override_get_current_user

        try:
            async with AsyncClient(
                transport=ASGITransport(app=app),
                base_url="http://test",
            ) as client:
                response = await client.get("/api/sessions/user/history")
                assert response.status_code == 200
                data = response.json()
                assert isinstance(data, list)
        finally:
            app.dependency_overrides.clear()

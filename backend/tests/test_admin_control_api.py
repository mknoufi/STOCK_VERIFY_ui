from datetime import datetime
from unittest.mock import MagicMock, mock_open, patch

import pytest
from fastapi.testclient import TestClient

from backend.auth import get_current_user
from backend.server import app

client = TestClient(app)


# Mock admin user
@pytest.fixture
def admin_user():
    return {"username": "admin", "role": "admin"}


@pytest.fixture(autouse=True)
def override_auth(admin_user):
    app.dependency_overrides[get_current_user] = lambda: admin_user
    yield
    app.dependency_overrides = {}


@pytest.fixture
def mock_psutil():
    with patch("backend.api.admin_control_api.psutil") as mock:
        yield mock


@pytest.fixture
def mock_port_detector():
    with patch("backend.api.admin_control_api.PortDetector") as mock:
        yield mock


@pytest.fixture
def mock_sql_connector():
    with patch("backend.api.admin_control_api.sql_connector") as mock:
        mock.config = {
            "host": "localhost",
            "port": 1433,
            "database": "test_db",
            "user": "sa",
        }
        yield mock


@pytest.fixture
def mock_service_manager():
    with patch("backend.api.admin_control_api.ServiceManager") as mock:
        yield mock


def test_get_services_status(
    mock_psutil, mock_port_detector, mock_sql_connector, mock_service_manager
):
    # Setup mocks
    mock_service_manager.is_port_in_use.return_value = True
    mock_service_manager.get_process_using_port.return_value = 1234

    process_mock = MagicMock()
    process_mock.cmdline.return_value = ["python", "server.py"]
    process_mock.create_time.return_value = 1000000000
    mock_psutil.Process.return_value = process_mock

    mock_port_detector.get_mongo_status.return_value = {
        "is_running": True,
        "port": 27017,
        "url": "mongodb://localhost:27017",
        "status": "connected",
    }

    mock_sql_connector.test_connection.return_value = True

    response = client.get("/api/admin/control/services/status")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "data" in data
    services = data["data"]
    assert services["backend"]["running"] is True
    assert services["mongodb"]["running"] is True
    assert services["sql_server"]["running"] is True


def test_get_service_logs_backend():
    with (
        patch("backend.api.admin_control_api.Path.exists", return_value=True),
        patch(
            "builtins.open",
            mock_open(read_data="2023-10-27 10:00:00 - logger - INFO - Test log message\n"),
        ),
    ):
        response = client.get("/api/admin/control/logs/backend")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert len(data["data"]["logs"]) > 0
        assert data["data"]["logs"][0]["message"] == "Test log message"


def test_get_system_issues(mock_port_detector, mock_sql_connector, mock_service_manager):
    # Simulate issues
    mock_port_detector.get_mongo_status.return_value = {"is_running": False}
    mock_service_manager.is_port_in_use.return_value = False  # Backend down
    mock_sql_connector.test_connection.return_value = False

    response = client.get("/api/admin/control/system/issues")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    issues = data["data"]["issues"]
    assert len(issues) >= 3
    assert any(i["service"] == "mongodb" for i in issues)
    assert any(i["service"] == "backend" for i in issues)
    assert any(i["service"] == "sql_server" for i in issues)


def test_get_sql_server_config(mock_sql_connector):
    response = client.get("/api/admin/control/sql-server/config")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["host"] == "localhost"
    assert "password" not in data["data"]


def test_update_sql_server_config(mock_sql_connector):
    new_config = {
        "host": "new_host",
        "port": 1433,
        "database": "new_db",
        "user": "new_user",
        "password": "new_password",
    }

    response = client.post("/api/admin/control/sql-server/config", json=new_config)
    assert response.status_code == 200
    assert mock_sql_connector.connect.called
    mock_sql_connector.connect.assert_called_with(
        "new_host", 1433, "new_db", "new_user", "new_password"
    )


def test_test_sql_server_connection(mock_sql_connector):
    mock_sql_connector.test_connection.return_value = True
    response = client.post("/api/admin/control/sql-server/test")
    assert response.status_code == 200
    assert response.json()["success"] is True

    # Test with config
    config = {"host": "test_host", "port": 1433, "database": "test_db"}
    response = client.post("/api/admin/control/sql-server/test", json=config)
    assert response.status_code == 200
    assert mock_sql_connector.connect.called


def test_start_backend(mock_service_manager, mock_psutil):
    # Mock backend not running
    mock_service_manager.is_port_in_use.return_value = False

    response = client.post("/api/admin/control/services/backend/start")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "start command issued" in data["message"]


def test_stop_backend(mock_service_manager, mock_psutil):
    # Mock backend running
    mock_service_manager.is_port_in_use.return_value = True
    mock_service_manager.get_process_using_port.return_value = 1234

    process_mock = MagicMock()
    process_mock.cmdline.return_value = ["python", "server.py"]
    mock_psutil.Process.return_value = process_mock

    response = client.post("/api/admin/control/services/backend/stop")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "Stopped" in data["message"]


def test_start_frontend(mock_service_manager, mock_psutil):
    # Mock frontend not running
    mock_service_manager.is_port_in_use.return_value = False

    response = client.post("/api/admin/control/services/frontend/start")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "start command issued" in data["message"]


def test_stop_frontend(mock_service_manager, mock_psutil):
    # Mock frontend running
    mock_service_manager.kill_processes_by_name.return_value = 1
    mock_service_manager.is_port_in_use.return_value = False

    response = client.post("/api/admin/control/services/frontend/stop")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "Stopped" in data["message"]


def test_get_available_reports():
    response = client.get("/api/admin/control/reports/available")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["data"]["reports"]) > 0
    assert data["data"]["reports"][0]["id"] == "user_activity"


def test_get_login_devices(test_db, admin_user):
    # Ensure admin user is used (override any defaults from test_db)
    app.dependency_overrides[get_current_user] = lambda: admin_user

    # Mock sessions collection
    # Since test_db is an InMemoryDatabase, we can directly insert data
    test_db.sessions._documents.append(
        {
            "user": "user1",
            "device_info": {"platform": "iOS", "device": "iPhone 12"},
            "ip_address": "192.168.1.10",
            "last_activity": datetime.utcnow(),
            "created_at": datetime.utcnow(),
        }
    )

    response = client.get("/api/admin/control/devices")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["data"]["devices"]) == 1
    assert data["data"]["devices"][0]["user"] == "user1"
    assert data["data"]["devices"][0]["platform"] == "iOS"
    assert data["data"]["devices"][0]["ip_address"] == "192.168.1.10"

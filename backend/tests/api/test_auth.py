import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from datetime import datetime, timedelta
from backend.api.auth import (
    check_rate_limit,
    find_user_by_username,
    generate_auth_tokens,
    register,
    UserRegister
)
from backend.utils.result import Ok, Fail
from backend.exceptions import RateLimitError, NotFoundError

@pytest.fixture
def mock_cache_service():
    with patch("backend.api.auth.get_cache_service") as mock:
        service = AsyncMock()
        mock.return_value = service
        yield service

@pytest.fixture
def mock_db():
    with patch("backend.api.auth.get_db") as mock:
        db = AsyncMock()
        mock.return_value = db
        yield db

@pytest.fixture
def mock_refresh_token_service():
    with patch("backend.api.auth.get_refresh_token_service") as mock:
        service = MagicMock()
        service.create_refresh_token.return_value = "refresh_token"
        service.store_refresh_token = AsyncMock()
        mock.return_value = service
        yield service

@pytest.fixture
def mock_settings():
    with patch("backend.api.auth.settings") as mock:
        mock.RATE_LIMIT_MAX_ATTEMPTS = 5
        mock.RATE_LIMIT_TTL_SECONDS = 300
        mock.ACCESS_TOKEN_EXPIRE_MINUTES = 15
        mock.REFRESH_TOKEN_EXPIRE_DAYS = 30
        yield mock

@pytest.fixture
def mock_auth_deps():
    with patch("backend.api.auth.auth_deps") as mock:
        mock.secret_key = "secret"
        mock.algorithm = "HS256"
        mock.db = AsyncMock()
        yield mock

@pytest.mark.asyncio
async def test_check_rate_limit_success(mock_cache_service, mock_settings):
    mock_cache_service.get.return_value = 0
    
    result = await check_rate_limit("127.0.0.1")
    
    assert result.is_ok
    assert result.unwrap() is True
    mock_cache_service.set.assert_called_with("login_attempts", "127.0.0.1", 1, ttl=300)

@pytest.mark.asyncio
async def test_check_rate_limit_exceeded(mock_cache_service, mock_settings):
    mock_cache_service.get.return_value = 5
    
    result = await check_rate_limit("127.0.0.1")
    
    assert result.is_err
    assert isinstance(result._error, RateLimitError)
    mock_cache_service.set.assert_called_with("login_attempts", "127.0.0.1", 5, ttl=300)

@pytest.mark.asyncio
async def test_find_user_by_username_found(mock_db):
    user = {"username": "testuser", "role": "staff"}
    mock_db.users.find_one.return_value = user
    
    result = await find_user_by_username("testuser")
    
    assert result.is_ok
    assert result.unwrap() == user

@pytest.mark.asyncio
async def test_find_user_by_username_not_found(mock_db):
    mock_db.users.find_one.return_value = None
    
    result = await find_user_by_username("testuser")
    
    assert result.is_err
    assert isinstance(result._error, NotFoundError)

@pytest.mark.asyncio
async def test_generate_auth_tokens_success(mock_refresh_token_service, mock_settings, mock_auth_deps):
    user = {"username": "testuser", "role": "staff"}
    request = MagicMock()
    
    with patch("backend.api.auth.create_access_token") as mock_create_token:
        mock_create_token.return_value = "access_token"
        
        result = await generate_auth_tokens(user, "127.0.0.1", request)
        
        assert result.is_ok
        value = result.unwrap()
        assert value["access_token"] == "access_token"
        assert value["refresh_token"] == "refresh_token"
        mock_refresh_token_service.store_refresh_token.assert_called_once()

@pytest.mark.asyncio
async def test_register_success(mock_db, mock_refresh_token_service, mock_settings, mock_auth_deps):
    mock_db.users.find_one.return_value = None
    # mock_db.users.insert_one is not used, auth_deps.db.users.insert_one is used
    mock_auth_deps.db.users.insert_one.return_value.inserted_id = "new_id"
    
    user_input = UserRegister(
        username="newuser",
        password="password123",
        role="staff",
        full_name="New User"
    )
    
    with patch("backend.api.auth.get_password_hash") as mock_hash, \
         patch("backend.api.auth.create_access_token") as mock_create_token:
        
        mock_hash.return_value = "hashed_password"
        mock_create_token.return_value = "access_token"
        
        response = await register(user_input)
        
        assert response["access_token"] == "access_token"
        assert response["refresh_token"] == "refresh_token"
        
        # Verify user insertion
        mock_auth_deps.db.users.insert_one.assert_called_once()
        call_args = mock_auth_deps.db.users.insert_one.call_args
        inserted_user = call_args[0][0]
        assert inserted_user["username"] == "newuser"
        assert inserted_user["hashed_password"] == "hashed_password"
        assert inserted_user["role"] == "staff"

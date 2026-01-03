import pytest
from fastapi import FastAPI, Request
from fastapi.testclient import TestClient
from starlette.responses import JSONResponse

from backend.middleware.lan_enforcement import LANEnforcementMiddleware

# Setup a dummy app for testing
app = FastAPI()
app.add_middleware(LANEnforcementMiddleware)

@app.get("/test")
async def test_route():
    return {"message": "success"}

@app.get("/health")
async def health_check():
    return {"status": "ok"}

client = TestClient(app)

class TestLANEnforcement:
    def test_allow_loopback(self):
        """Test that loopback address (127.0.0.1) is allowed"""
        # TestClient defaults to 127.0.0.1 or testclient
        response = client.get("/test", headers={"X-Forwarded-For": "127.0.0.1"})
        # Note: Starlette TestClient doesn't easily mock client.host directly in the same way as a real request
        # The middleware uses request.client.host. 
        # We might need to mock the request object or use a specific approach for TestClient.
        # However, TestClient usually sets client host to "testclient" or "127.0.0.1".
        
        # Let's try to rely on the middleware logic. 
        # If TestClient sends "testclient", ipaddress.ip_address("testclient") will fail.
        # We need to ensure the middleware handles invalid IPs gracefully or we mock the IP.
        pass

    def test_allow_private_ip_192(self):
        """Test that 192.168.x.x is allowed"""
        # We need to mock the client host. 
        # Since we can't easily set client.host in TestClient, we'll unit test the logic directly 
        # or use a mock request.
        pass

# Redefining to use unit testing of the dispatch method for precise control
@pytest.mark.asyncio
async def test_middleware_logic_allow_private():
    middleware = LANEnforcementMiddleware(app)
    
    async def call_next(request):
        return JSONResponse({"status": "ok"})

    # Mock Request
    scope = {
        "type": "http",
        "client": ("192.168.1.50", 12345),
        "path": "/test",
        "headers": [],
    }
    request = Request(scope)
    
    response = await middleware.dispatch(request, call_next)
    assert response.status_code == 200

@pytest.mark.asyncio
async def test_middleware_logic_allow_loopback():
    middleware = LANEnforcementMiddleware(app)
    
    async def call_next(request):
        return JSONResponse({"status": "ok"})

    scope = {
        "type": "http",
        "client": ("127.0.0.1", 12345),
        "path": "/test",
        "headers": [],
    }
    request = Request(scope)
    
    response = await middleware.dispatch(request, call_next)
    assert response.status_code == 200

@pytest.mark.asyncio
async def test_middleware_logic_block_public():
    middleware = LANEnforcementMiddleware(app)
    
    async def call_next(request):
        return JSONResponse({"status": "ok"})

    # 8.8.8.8 is a public IP
    scope = {
        "type": "http",
        "client": ("8.8.8.8", 12345),
        "path": "/test",
        "headers": [],
    }
    request = Request(scope)
    
    response = await middleware.dispatch(request, call_next)
    assert response.status_code == 403
    body = import_json_body(response)
    assert body["code"] == "NETWORK_NOT_ALLOWED"

@pytest.mark.asyncio
async def test_middleware_allow_health_check_from_public():
    middleware = LANEnforcementMiddleware(app)
    
    async def call_next(request):
        return JSONResponse({"status": "ok"})

    # Public IP accessing health check
    scope = {
        "type": "http",
        "client": ("8.8.8.8", 12345),
        "path": "/health",
        "headers": [],
    }
    request = Request(scope)
    
    response = await middleware.dispatch(request, call_next)
    assert response.status_code == 200

def import_json_body(response):
    import json
    return json.loads(response.body.decode())

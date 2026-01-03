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


# TestLANEnforcement class removed as it is redundant and problematic with TestClient
# The logic is fully covered by the async unit tests below (test_middleware_logic_*)


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

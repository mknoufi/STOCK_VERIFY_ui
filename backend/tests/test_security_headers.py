"""
Tests for Security Headers Middleware
Verifies OWASP security headers are properly applied
"""

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend.middleware.security_headers import SecurityHeadersMiddleware


@pytest.fixture
def test_app():
    """Create test FastAPI app"""
    app = FastAPI()

    @app.get("/test")
    async def test_endpoint():
        return {"message": "test"}

    return app


@pytest.fixture
def client_with_security_headers(test_app):
    """Create test client with security headers middleware"""
    test_app.add_middleware(SecurityHeadersMiddleware)
    return TestClient(test_app)


@pytest.fixture
def client_with_strict_csp(test_app):
    """Create test client with strict CSP"""
    test_app.add_middleware(
        SecurityHeadersMiddleware,
        STRICT_CSP=True,
        force_https=True,
    )
    return TestClient(test_app)


class TestSecurityHeadersMiddleware:
    """Test security headers middleware"""

    def test_security_headers_present(self, client_with_security_headers):
        """Test that security headers are present in response"""
        response = client_with_security_headers.get("/test")

        # Check required security headers
        assert "X-Frame-Options" in response.headers
        assert "X-Content-Type-Options" in response.headers
        assert "X-XSS-Protection" in response.headers
        assert "Content-Security-Policy" in response.headers
        assert "Referrer-Policy" in response.headers
        assert "Permissions-Policy" in response.headers

    def test_x_frame_options_deny(self, client_with_security_headers):
        """Test X-Frame-Options is set to DENY"""
        response = client_with_security_headers.get("/test")

        assert response.headers["X-Frame-Options"] == "DENY"

    def test_x_content_type_options_nosniff(self, client_with_security_headers):
        """Test X-Content-Type-Options is set to nosniff"""
        response = client_with_security_headers.get("/test")

        assert response.headers["X-Content-Type-Options"] == "nosniff"

    def test_content_security_policy_default(self, client_with_security_headers):
        """Test default CSP policy"""
        response = client_with_security_headers.get("/test")

        csp = response.headers["Content-Security-Policy"]
        assert "default-src 'self'" in csp
        assert "script-src" in csp
        assert "style-src" in csp

    def test_content_security_policy_strict(self, client_with_strict_csp):
        """Test strict CSP policy"""
        response = client_with_strict_csp.get("/test")

        csp = response.headers["Content-Security-Policy"]
        # Strict CSP should not have unsafe-inline or unsafe-eval
        assert "'unsafe-inline'" not in csp or "'unsafe-eval'" not in csp

    def test_referrer_policy(self, client_with_security_headers):
        """Test Referrer-Policy header"""
        response = client_with_security_headers.get("/test")

        assert "Referrer-Policy" in response.headers
        assert response.headers["Referrer-Policy"] == "strict-origin-when-cross-origin"

    def test_permissions_policy(self, client_with_security_headers):
        """Test Permissions-Policy header"""
        response = client_with_security_headers.get("/test")

        assert "Permissions-Policy" in response.headers
        permissions = response.headers["Permissions-Policy"]
        assert "geolocation=()" in permissions
        assert "microphone=()" in permissions
        assert "camera=()" in permissions

    def test_dangerous_headers_removed(self, client_with_security_headers):
        """Test that dangerous headers are removed"""
        response = client_with_security_headers.get("/test")

        # These headers should not be present
        assert "Server" not in response.headers
        assert "X-Powered-By" not in response.headers
        assert "X-AspNet-Version" not in response.headers
        assert "X-AspNetMvc-Version" not in response.headers

    def test_hsts_only_for_https(self, client_with_security_headers):
        """Test HSTS header only for HTTPS"""
        # HTTP request should not have HSTS
        response = client_with_security_headers.get("/test")

        # HSTS should not be present for HTTP
        assert "Strict-Transport-Security" not in response.headers

    def test_cross_origin_headers(self, client_with_security_headers):
        """Test Cross-Origin headers"""
        response = client_with_security_headers.get("/test")

        # Check for Cross-Origin headers
        assert "Cross-Origin-Embedder-Policy" in response.headers
        assert "Cross-Origin-Opener-Policy" in response.headers
        assert "Cross-Origin-Resource-Policy" in response.headers

    def test_custom_options(self, test_app):
        """Test custom middleware options"""
        test_app.add_middleware(
            SecurityHeadersMiddleware,
            X_FRAME_OPTIONS="SAMEORIGIN",
            REFERRER_POLICY="no-referrer",
        )
        client = TestClient(test_app)

        response = client.get("/test")

        assert response.headers["X-Frame-Options"] == "SAMEORIGIN"
        assert response.headers["Referrer-Policy"] == "no-referrer"

    def test_middleware_does_not_break_functionality(self, client_with_security_headers):
        """Test middleware doesn't break normal functionality"""
        response = client_with_security_headers.get("/test")

        assert response.status_code == 200
        assert response.json() == {"message": "test"}

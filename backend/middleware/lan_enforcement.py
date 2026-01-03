import ipaddress
import logging
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

logger = logging.getLogger(__name__)


class LANEnforcementMiddleware(BaseHTTPMiddleware):
    """
    Middleware to enforce LAN-only access.
    Allows access if the client IP is private (RFC 1918) or loopback.
    """

    def __init__(self, app):
        super().__init__(app)
        # Paths that are always allowed (e.g., health checks, docs)
        self.allowed_paths = {
            "/health",
            "/api/health",
            "/docs",
            "/redoc",
            "/openapi.json",
            "/metrics",
        }

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip check for allowed paths
        if request.url.path in self.allowed_paths:
            return await call_next(request)

        client_ip = request.client.host if request.client else None
        
        if not client_ip:
            logger.warning("Request rejected: No client IP found")
            return JSONResponse(
                status_code=403,
                content={"code": "NETWORK_NOT_ALLOWED", "message": "Network access denied"},
            )

        try:
            ip_obj = ipaddress.ip_address(client_ip)
            
            # Allow if IP is private (LAN) or loopback (Localhost)
            # This ensures Client and Server are on the same local network (or VPN/Tunnel)
            is_allowed = ip_obj.is_private or ip_obj.is_loopback

            if not is_allowed:
                logger.warning(f"Request rejected: IP {client_ip} is not a local network address")
                return JSONResponse(
                    status_code=403,
                    content={
                        "code": "NETWORK_NOT_ALLOWED",
                        "message": "Access restricted to local network",
                    },
                )

        except ValueError:
            logger.warning(f"Request rejected: Invalid IP format {client_ip}")
            return JSONResponse(
                status_code=403,
                content={"code": "NETWORK_NOT_ALLOWED", "message": "Invalid network address"},
            )

        return await call_next(request)

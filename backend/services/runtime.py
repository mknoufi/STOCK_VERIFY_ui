from backend.services.cache_service import CacheService
from backend.services.refresh_token import RefreshTokenService

_CACHE_SERVICE: CacheService = None
_REFRESH_TOKEN_SERVICE: RefreshTokenService = None


def get_cache_service() -> CacheService:
    if _CACHE_SERVICE is None:
        raise RuntimeError("CacheService has not been initialized.")
    return _CACHE_SERVICE


def set_cache_service(service: CacheService) -> None:
    global _CACHE_SERVICE
    _CACHE_SERVICE = service


def get_refresh_token_service() -> RefreshTokenService:
    if _REFRESH_TOKEN_SERVICE is None:
        raise RuntimeError("RefreshTokenService has not been initialized.")
    return _REFRESH_TOKEN_SERVICE


def set_refresh_token_service(service: RefreshTokenService) -> None:
    global _REFRESH_TOKEN_SERVICE
    _REFRESH_TOKEN_SERVICE = service

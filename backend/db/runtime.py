"""Runtime database lifecycle management utilities."""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Optional

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

_MONGO_CLIENT: Optional[AsyncIOMotorClient] = None
_DATABASE: Optional[AsyncIOMotorDatabase] = None


@asynccontextmanager
def lifespan_db(
    uri: str, db_name: str
) -> AsyncIterator[tuple[AsyncIOMotorClient, AsyncIOMotorDatabase]]:
    """Create a Mongo client bound to the active event loop and tear it down safely."""
    global _MONGO_CLIENT, _DATABASE

    _MONGO_CLIENT = AsyncIOMotorClient(uri)
    _DATABASE = _MONGO_CLIENT[db_name]

    try:
        yield _MONGO_CLIENT, _DATABASE
    finally:
        if _MONGO_CLIENT:
            _MONGO_CLIENT.close()
        _MONGO_CLIENT = None
        _DATABASE = None


def get_db() -> AsyncIOMotorDatabase:
    """Return the active database instance.

    Raises:
        RuntimeError: if the database is not initialised via ``lifespan_db``.
    """
    if _DATABASE is None:
        raise RuntimeError(
            "Mongo database has not been initialised. Ensure lifespan is configured."
        )
    return _DATABASE


def get_client() -> AsyncIOMotorClient:
    if _MONGO_CLIENT is None:
        raise RuntimeError("Mongo client has not been initialised. Ensure lifespan is configured.")
    return _MONGO_CLIENT


def set_db(db: AsyncIOMotorDatabase) -> None:
    """Set the active database instance."""
    global _DATABASE
    _DATABASE = db


def set_client(client: AsyncIOMotorClient) -> None:
    """Set the active mongo client."""
    global _MONGO_CLIENT
    _MONGO_CLIENT = client

"""
Simple in-memory MongoDB substitute for backend unit tests.
Provides async collection helpers that mimic the subset of Motor APIs our tests use.
"""

from __future__ import annotations

import copy
import uuid
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, Iterable, List, Optional

from backend.services.activity_log import ActivityLogService
from backend.services.error_log import ErrorLogService
from backend.services.refresh_token import RefreshTokenService
from backend.auth.dependencies import init_auth_dependencies


def _match_condition(value: Any, condition: Dict[str, Any]) -> bool:
    """Evaluate comparison operators."""
    for op, expected in condition.items():
        if op == "$lt" and not (value < expected):
            return False
        if op == "$lte" and not (value <= expected):
            return False
        if op == "$gt" and not (value > expected):
            return False
        if op == "$gte" and not (value >= expected):
            return False
        if op == "$ne" and not (value != expected):
            return False
        if op not in {"$lt", "$lte", "$gt", "$gte", "$ne"}:
            raise ValueError(f"Unsupported operator: {op}")
    return True


def _match_filter(document: Dict[str, Any], filter_query: Optional[Dict[str, Any]]) -> bool:
    """Basic Mongo-style filter matching."""
    if not filter_query:
        return True

    for key, value in filter_query.items():
        if key == "$or":
            if not any(_match_filter(document, clause) for clause in value):
                return False
            continue

        doc_value = document.get(key)
        if isinstance(value, dict):
            if not _match_condition(doc_value, value):
                return False
        else:
            if doc_value != value:
                return False

    return True


def _apply_update(document: Dict[str, Any], update: Dict[str, Any]) -> bool:
    """Apply $set updates to the document."""
    modified = False
    set_values = update.get("$set", {})
    for key, value in set_values.items():
        if document.get(key) != value:
            document[key] = value
            modified = True

    return modified


@dataclass
class InsertOneResult:
    inserted_id: str


@dataclass
class UpdateResult:
    matched_count: int
    modified_count: int
    upserted_id: Optional[str] = None


@dataclass
class DeleteResult:
    deleted_count: int


class InMemoryCursor:
    def __init__(self, documents: Iterable[Dict[str, Any]]):
        self._documents = list(documents)

    def sort(self, key: str, direction: int) -> "InMemoryCursor":
        reverse = direction < 0
        self._documents.sort(key=lambda doc: doc.get(key, datetime.min), reverse=reverse)
        return self

    def skip(self, count: int) -> "InMemoryCursor":
        self._documents = self._documents[count:]
        return self

    def limit(self, count: int) -> "InMemoryCursor":
        self._documents = self._documents[:count]
        return self

    async def to_list(self, length: int) -> List[Dict[str, Any]]:
        return [copy.deepcopy(doc) for doc in self._documents[:length]]


class InMemoryCollection:
    def __init__(self):
        self._documents: List[Dict[str, Any]] = []

    def _ensure_id(self, document: Dict[str, Any]) -> None:
        document.setdefault("_id", uuid.uuid4().hex)

    async def find_one(self, filter: Dict[str, Any], *args, **kwargs) -> Optional[Dict[str, Any]]:
        print(f"DEBUG: find_one called with {filter}")
        for doc in self._documents:
            if _match_filter(doc, filter):
                print("DEBUG: find_one match found")
                return copy.deepcopy(doc)
        print("DEBUG: find_one no match")
        return None

    async def insert_one(self, document: Dict[str, Any], *args, **kwargs) -> InsertOneResult:
        print("DEBUG: insert_one called")
        doc_copy = copy.deepcopy(document)
        self._ensure_id(doc_copy)
        self._documents.append(doc_copy)
        print("DEBUG: insert_one done")
        return InsertOneResult(inserted_id=doc_copy["_id"])

    async def update_one(
        self,
        filter_query: Optional[Dict[str, Any]],
        update: Dict[str, Any],
        upsert: bool = False,
    ) -> UpdateResult:
        for doc in self._documents:
            if _match_filter(doc, filter_query):
                modified = _apply_update(doc, update)
                return UpdateResult(
                    matched_count=1,
                    modified_count=1 if modified else 0,
                )

        if upsert:
            new_doc: Dict[str, Any] = {}
            if filter_query:
                for key, value in filter_query.items():
                    if not key.startswith("$"):
                        new_doc[key] = value
            set_on_insert = update.get("$setOnInsert", {})
            new_doc.update(set_on_insert)
            _apply_update(new_doc, update)
            self._ensure_id(new_doc)
            self._documents.append(new_doc)
            return UpdateResult(matched_count=0, modified_count=1, upserted_id=new_doc["_id"])

        return UpdateResult(matched_count=0, modified_count=0)

    async def delete_many(self, filter_query: Optional[Dict[str, Any]]) -> DeleteResult:
        to_keep = []
        deleted = 0
        for doc in self._documents:
            if _match_filter(doc, filter_query):
                deleted += 1
            else:
                to_keep.append(doc)
        self._documents = to_keep
        return DeleteResult(deleted_count=deleted)

    async def count_documents(self, filter_query: Optional[Dict[str, Any]] = None) -> int:
        return sum(1 for doc in self._documents if _match_filter(doc, filter_query))

    def find(
        self,
        filter_query: Optional[Dict[str, Any]] = None,
        projection: Optional[Dict[str, int]] = None,
    ):
        results = []
        for doc in self._documents:
            if _match_filter(doc, filter_query):
                if projection:
                    projected = {}
                    include_fields = [k for k, v in projection.items() if v]
                    if include_fields:
                        for field in include_fields:
                            if field in doc and projection[field]:
                                projected[field] = doc[field]
                        results.append(projected)
                        continue
                results.append(doc)
        return InMemoryCursor(results)


class InMemoryDatabase:
    """Container that mimics the Motor database object used throughout the app."""

    def __init__(self):
        self.client = self
        self.users = InMemoryCollection()
        self.refresh_tokens = InMemoryCollection()
        self.login_attempts = InMemoryCollection()
        self.activity_logs = InMemoryCollection()
        self.error_logs = InMemoryCollection()
        self.sessions = InMemoryCollection()
        self.count_lines = InMemoryCollection()
        self.erp_items = InMemoryCollection()
        self.erp_sync_metadata = InMemoryCollection()
        self.erp_config = InMemoryCollection()
        self.verification_logs = InMemoryCollection()
        self.item_variances = InMemoryCollection()

    async def command(self, *_args, **_kwargs):
        """Simulate db.command('ping')."""
        return {"ok": 1}


def setup_server_with_in_memory_db(monkeypatch) -> InMemoryDatabase:
    """
    Patch the FastAPI server module to use an in-memory database and lightweight services.
    Returns the database instance for further customization in tests.
    """

    import server as server_module

    print("DEBUG: Imported server module")

    fake_db = InMemoryDatabase()
    monkeypatch.setattr(server_module, "db", fake_db)
    server_module.refresh_token_service = RefreshTokenService(
        fake_db, server_module.SECRET_KEY, server_module.ALGORITHM
    )
    server_module.activity_log_service = ActivityLogService(fake_db)
    server_module.error_log_service = ErrorLogService(fake_db)

    class _NoOpMigrationManager:
        async def ensure_indexes(self):
            return None

        async def run_migrations(self):
            return None

    monkeypatch.setattr(server_module, "migration_manager", _NoOpMigrationManager())
    monkeypatch.setenv("RATE_LIMIT_ENABLED", "false")

    # Mock SQL Connector
    from unittest.mock import MagicMock, AsyncMock

    mock_sql = MagicMock()
    mock_sql.connect.return_value = None
    mock_sql.test_connection.return_value = False
    monkeypatch.setattr(server_module, "sql_connector", mock_sql)

    # Mock DatabaseHealthService
    mock_health = MagicMock()
    mock_health.start = MagicMock()
    mock_health.stop = MagicMock()
    # Patch the class
    monkeypatch.setattr(server_module, "DatabaseHealthService", MagicMock(return_value=mock_health))
    # Patch the existing instance if it exists
    if hasattr(server_module, "database_health_service"):
        monkeypatch.setattr(server_module, "database_health_service", mock_health)

    # Mock AutoSyncManager
    mock_auto_sync = MagicMock()
    mock_auto_sync.start = AsyncMock()
    mock_auto_sync.stop = AsyncMock()
    monkeypatch.setattr(server_module, "AutoSyncManager", MagicMock(return_value=mock_auto_sync))
    if hasattr(server_module, "auto_sync_manager"):
        monkeypatch.setattr(server_module, "auto_sync_manager", mock_auto_sync)

    # Mock ScheduledExportService
    mock_export_service = MagicMock()
    mock_export_service.start = MagicMock()
    mock_export_service.stop = MagicMock()
    monkeypatch.setattr(
        server_module, "ScheduledExportService", MagicMock(return_value=mock_export_service)
    )
    if hasattr(server_module, "scheduled_export_service"):
        monkeypatch.setattr(server_module, "scheduled_export_service", mock_export_service)

    # Mock CacheService to avoid Redis connection attempts
    from backend.services.cache_service import CacheService

    mock_cache = CacheService(redis_url=None)  # Force in-memory
    mock_cache.initialize = AsyncMock()
    monkeypatch.setattr(server_module, "cache_service", mock_cache)

    mock_cache.initialize = AsyncMock()
    monkeypatch.setattr(server_module, "cache_service", mock_cache)

    # Manually initialize verification API since lifespan might not run
    from backend.api.item_verification_api import init_verification_api

    init_verification_api(fake_db)

    init_auth_dependencies(fake_db, server_module.SECRET_KEY, server_module.ALGORITHM)

    # Seed default users expected by various tests (staff1, supervisor, admin)
    def _seed_user(username: str, password: str, full_name: str, role: str):
        fake_db.users._documents.append(
            {
                "_id": uuid.uuid4().hex,
                "username": username,
                "hashed_password": server_module.get_password_hash(password),
                "full_name": full_name,
                "role": role,
                "is_active": True,
                "permissions": [],
                "created_at": datetime.utcnow(),
            }
        )

    _seed_user("staff1", "staff123", "Staff Member", "staff")
    _seed_user("supervisor", "super123", "Supervisor", "supervisor")
    _seed_user("admin", "admin123", "Administrator", "admin")

    return fake_db

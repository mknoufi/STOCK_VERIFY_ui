from unittest.mock import patch

import pytest

from backend.services.sync_conflicts_service import (
    ConflictResolution,
    ConflictStatus,
    SyncConflictsService,
)
from backend.tests.utils.in_memory_db import InMemoryDatabase


@pytest.fixture
def mock_object_id():
    with patch("backend.services.sync_conflicts_service.ObjectId") as mock:
        mock.side_effect = lambda x: x
        yield mock


@pytest.fixture
def db():
    return InMemoryDatabase()


@pytest.fixture
def service(db, mock_object_id):
    return SyncConflictsService(db)


@pytest.mark.asyncio
async def test_detect_conflict_no_conflict(service):
    local_data = {"name": "Item 1", "qty": 10}
    server_data = {"name": "Item 1", "qty": 10}

    conflict_id = await service.detect_conflict(
        entity_type="item",
        entity_id="123",
        local_data=local_data,
        server_data=server_data,
        user="test_user",
    )

    assert conflict_id is None
    count = await service.db.sync_conflicts.count_documents({})
    assert count == 0


@pytest.mark.asyncio
async def test_detect_conflict_with_conflict(service):
    local_data = {"name": "Item 1", "qty": 10}
    server_data = {"name": "Item 1", "qty": 20}

    conflict_id = await service.detect_conflict(
        entity_type="item",
        entity_id="123",
        local_data=local_data,
        server_data=server_data,
        user="test_user",
    )

    assert conflict_id is not None

    # Verify conflict record
    conflict = (
        await service.db.sync_conflicts.find({"entity_id": "123"}).to_list(length=1)
    )[0]

    assert conflict["entity_type"] == "item"
    assert conflict["status"] == ConflictStatus.PENDING.value
    assert len(conflict["conflicts"]) == 1
    assert conflict["conflicts"][0]["field"] == "qty"
    assert conflict["conflicts"][0]["local_value"] == 10
    assert conflict["conflicts"][0]["server_value"] == 20


@pytest.mark.asyncio
async def test_get_conflicts(service):
    # Insert some conflicts
    await service.db.sync_conflicts.insert_one(
        {"entity_type": "item", "status": ConflictStatus.PENDING.value, "user": "user1"}
    )
    await service.db.sync_conflicts.insert_one(
        {
            "entity_type": "item",
            "status": ConflictStatus.RESOLVED.value,
            "user": "user1",
        }
    )

    # Test get pending
    pending = await service.get_conflicts(status=ConflictStatus.PENDING)
    assert len(pending) == 1
    assert pending[0]["status"] == ConflictStatus.PENDING.value

    # Test get resolved
    resolved = await service.get_conflicts(status=ConflictStatus.RESOLVED)
    assert len(resolved) == 1
    assert resolved[0]["status"] == ConflictStatus.RESOLVED.value


@pytest.mark.asyncio
async def test_resolve_conflict_accept_server(service):
    # Create a conflict
    insert_result = await service.db.sync_conflicts.insert_one(
        {
            "entity_type": "item",
            "entity_id": "123",
            "status": ConflictStatus.PENDING.value,
            "local_data": {"qty": 10},
            "server_data": {"qty": 20},
        }
    )
    conflict_id = str(insert_result.inserted_id)

    # Ensure entity exists for _apply_resolved_data
    await service.db.erp_items.insert_one({"_id": "123", "qty": 5})

    # Resolve
    result = await service.resolve_conflict(
        conflict_id=conflict_id,
        resolution=ConflictResolution.ACCEPT_SERVER,
        resolved_by="resolver",
    )

    assert result is not None
    assert result["resolution"] == ConflictResolution.ACCEPT_SERVER.value
    assert result["resolved_data"]["qty"] == 20

    # Verify DB update
    conflict = await service.db.sync_conflicts.find_one({"_id": conflict_id})
    assert conflict["status"] == ConflictStatus.RESOLVED.value
    assert conflict["resolved_by"] == "resolver"


@pytest.mark.asyncio
async def test_resolve_conflict_accept_local(service):
    # Create a conflict
    insert_result = await service.db.sync_conflicts.insert_one(
        {
            "entity_type": "item",
            "entity_id": "123",
            "status": ConflictStatus.PENDING.value,
            "local_data": {"qty": 10},
            "server_data": {"qty": 20},
        }
    )
    conflict_id = str(insert_result.inserted_id)

    # Ensure entity exists for _apply_resolved_data
    await service.db.erp_items.insert_one({"_id": "123", "qty": 5})

    # Resolve
    result = await service.resolve_conflict(
        conflict_id=conflict_id,
        resolution=ConflictResolution.ACCEPT_LOCAL,
        resolved_by="resolver",
    )

    assert result is not None
    assert result["resolution"] == ConflictResolution.ACCEPT_LOCAL.value
    assert result["resolved_data"]["qty"] == 10

    # Verify DB update
    conflict = await service.db.sync_conflicts.find_one({"_id": conflict_id})
    assert conflict["status"] == ConflictStatus.RESOLVED.value

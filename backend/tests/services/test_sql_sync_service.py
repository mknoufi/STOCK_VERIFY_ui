from __future__ import annotations

from datetime import datetime, timedelta
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

import pytest

from services.sql_sync_service import SQLSyncService


def _make_service(
    *, sql_connector: Mock | None = None, mongo_db: object | None = None
) -> SQLSyncService:
    if sql_connector is None:
        sql_connector = Mock()
        sql_connector.test_connection.return_value = True

    if mongo_db is None:
        erp_items = SimpleNamespace(
            find_one=AsyncMock(),
            insert_one=AsyncMock(),
            update_one=AsyncMock(),
        )
        mongo_db = SimpleNamespace(erp_items=erp_items)

    return SQLSyncService(sql_connector=sql_connector, mongo_db=mongo_db)


@pytest.mark.asyncio
async def test_should_check_new_items_true_when_never_checked() -> None:
    service = _make_service()
    service._last_new_item_check = None
    assert service.should_check_new_items() is True


@pytest.mark.asyncio
async def test_should_check_new_items_respects_interval() -> None:
    service = _make_service()
    service._new_item_check_interval = 1800

    service._last_new_item_check = datetime.utcnow() - timedelta(seconds=60)
    assert service.should_check_new_items() is False

    service._last_new_item_check = datetime.utcnow() - timedelta(seconds=1800)
    assert service.should_check_new_items() is True


@pytest.mark.asyncio
async def test_should_run_nightly_sync_hour_and_once_per_day(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    # Patch the module-level datetime used by SQLSyncService
    import services.sql_sync_service as sql_sync_service

    fixed_now = datetime(2025, 1, 2, 2, 5, 0)

    class FixedDateTime(datetime):
        @classmethod
        def utcnow(cls):  # type: ignore[override]
            return fixed_now

    monkeypatch.setattr(sql_sync_service, "datetime", FixedDateTime)

    service = _make_service()
    service.nightly_sync_hour = 2
    service._last_nightly_sync = None
    assert service.should_run_nightly_sync() is True

    service._last_nightly_sync = fixed_now
    assert service.should_run_nightly_sync() is False


@pytest.mark.asyncio
async def test_sync_single_item_creates_new_item_when_missing() -> None:
    sql_connector = Mock()
    sql_connector.test_connection.return_value = True

    erp_items = SimpleNamespace(
        find_one=AsyncMock(return_value=None),
        insert_one=AsyncMock(),
        update_one=AsyncMock(),
    )
    mongo_db = SimpleNamespace(erp_items=erp_items)

    service = _make_service(sql_connector=sql_connector, mongo_db=mongo_db)

    stats = {
        "items_checked": 0,
        "qty_updated": 0,
        "items_created": 0,
        "qty_changes_detected": 0,
        "errors": 0,
        "duration": 0,
    }

    sql_item = {"item_code": "ABC", "item_name": "Item ABC", "stock_qty": 5, "category": "Cat"}

    await service._sync_single_item(sql_item, stats)

    assert stats["items_created"] == 1
    assert stats["items_checked"] == 1
    assert erp_items.insert_one.await_count == 1

    inserted_doc = erp_items.insert_one.await_args.args[0]
    assert inserted_doc["item_code"] == "ABC"
    assert inserted_doc["stock_qty"] == 5.0
    assert inserted_doc["synced_from_sql"] is True


@pytest.mark.asyncio
async def test_update_existing_item_updates_qty_and_metadata() -> None:
    sql_connector = Mock()
    sql_connector.test_connection.return_value = True

    erp_items = SimpleNamespace(
        find_one=AsyncMock(),
        insert_one=AsyncMock(),
        update_one=AsyncMock(),
    )
    mongo_db = SimpleNamespace(erp_items=erp_items)
    service = _make_service(sql_connector=sql_connector, mongo_db=mongo_db)

    stats = {
        "items_checked": 0,
        "qty_updated": 0,
        "items_created": 0,
        "qty_changes_detected": 0,
        "errors": 0,
        "duration": 0,
    }

    mongo_item = {
        "item_code": "ABC",
        "stock_qty": 10,
        # Metadata present or missing
        "location": "L1",
        "gst_percent": None,
        "hsn_code": "",
    }
    sql_item = {
        "item_code": "ABC",
        "stock_qty": 12,
        "location": "L2",  # should always sync if changed
        "gst_percent": 18,  # numeric: should update because existing is None
        "hsn_code": "1234",  # should update because existing is empty string
    }

    await service._update_existing_item("ABC", sql_item, 12.0, mongo_item, stats)

    assert stats["qty_changes_detected"] == 1
    assert stats["qty_updated"] == 1

    assert erp_items.update_one.await_count == 1
    _filter, update_doc = erp_items.update_one.await_args.args
    assert _filter == {"item_code": "ABC"}
    assert "$set" in update_doc

    set_fields = update_doc["$set"]
    assert set_fields["stock_qty"] == 12.0
    assert set_fields["sql_server_qty"] == 12.0
    assert set_fields["location"] == "L2"
    assert set_fields["gst_percent"] == 18.0
    assert set_fields["hsn_code"] == "1234"


@pytest.mark.asyncio
async def test_check_item_qty_realtime_sql_unavailable_uses_cache() -> None:
    sql_connector = Mock()
    sql_connector.test_connection.return_value = False

    erp_items = SimpleNamespace(
        find_one=AsyncMock(return_value={"item_code": "ABC", "stock_qty": 7}),
        insert_one=AsyncMock(),
        update_one=AsyncMock(),
    )
    mongo_db = SimpleNamespace(erp_items=erp_items)

    service = _make_service(sql_connector=sql_connector, mongo_db=mongo_db)

    result = await service.check_item_qty_realtime("ABC")

    assert result["item_code"] == "ABC"
    assert result["updated"] is False
    assert result["source"] == "mongodb_cache"


@pytest.mark.asyncio
async def test_check_item_qty_realtime_updates_when_qty_changed() -> None:
    sql_connector = Mock()
    sql_connector.test_connection.return_value = True
    sql_connector.get_item_by_code.return_value = {"item_code": "ABC", "stock_qty": 9}

    erp_items = SimpleNamespace(
        find_one=AsyncMock(return_value={"item_code": "ABC", "stock_qty": 7}),
        insert_one=AsyncMock(),
        update_one=AsyncMock(),
    )
    mongo_db = SimpleNamespace(erp_items=erp_items)

    service = _make_service(sql_connector=sql_connector, mongo_db=mongo_db)

    result = await service.check_item_qty_realtime("ABC")

    assert result["updated"] is True
    assert result["previous_qty"] == 7.0
    assert result["sql_qty"] == 9.0
    assert result["delta"] == 2.0

    assert erp_items.update_one.await_count == 1
    _filter, update_doc = erp_items.update_one.await_args.args
    assert _filter == {"item_code": "ABC"}
    assert update_doc["$set"]["stock_qty"] == 9.0

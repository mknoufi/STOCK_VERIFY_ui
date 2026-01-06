from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from backend.api.mapping_api import (
    ColumnMapping,
    MappingConfig,
    get_columns,
    get_current_mapping,
    get_tables,
    preview_mapping,
    save_mapping,
)

# Mock data
MOCK_TABLES = [("Table1",), ("Table2",)]
MOCK_COLUMNS = [("col1", "int", "NO", None), ("col2", "varchar", "YES", 50)]
MOCK_SAMPLE_DATA = [(1, "test1"), (2, "test2")]


@pytest.fixture
def mock_pyodbc():
    with patch("backend.api.mapping_api.pyodbc") as mock:
        mock_conn = MagicMock()
        mock_cursor = MagicMock()

        mock.connect.return_value = mock_conn
        mock_conn.cursor.return_value = mock_cursor

        yield mock


@pytest.fixture
def mock_db():
    with patch("backend.server.db", new_callable=AsyncMock) as mock:
        yield mock


@pytest.mark.asyncio
async def test_get_tables(mock_pyodbc):
    mock_cursor = mock_pyodbc.connect.return_value.cursor.return_value
    mock_cursor.fetchall.return_value = MOCK_TABLES

    current_user = {"username": "testuser", "role": "admin"}

    response = await get_tables(
        host="localhost",
        database="testdb",
        user="user",
        password="password",
        current_user=current_user,
    )

    assert response["count"] == 2
    assert "Table1" in response["tables"]
    assert "Table2" in response["tables"]

    # Verify query execution
    mock_cursor.execute.assert_called_once()
    args, _ = mock_cursor.execute.call_args
    assert "INFORMATION_SCHEMA.TABLES" in args[0]


@pytest.mark.asyncio
async def test_get_columns(mock_pyodbc):
    mock_cursor = mock_pyodbc.connect.return_value.cursor.return_value
    mock_cursor.fetchall.return_value = MOCK_COLUMNS

    current_user = {"username": "testuser", "role": "admin"}

    response = await get_columns(
        host="localhost",
        database="testdb",
        table_name="Table1",
        current_user=current_user,
    )

    assert response["count"] == 2
    assert response["columns"][0]["name"] == "col1"
    assert response["columns"][1]["data_type"] == "varchar"
    assert response["columns"][1]["max_length"] == 50

    # Verify query execution
    mock_cursor.execute.assert_called_once()
    args, _ = mock_cursor.execute.call_args
    assert "INFORMATION_SCHEMA.COLUMNS" in args[0]


@pytest.mark.asyncio
async def test_preview_mapping(mock_pyodbc):
    mock_cursor = mock_pyodbc.connect.return_value.cursor.return_value
    mock_cursor.description = [("item_code",), ("item_name",)]
    mock_cursor.fetchall.return_value = MOCK_SAMPLE_DATA

    current_user = {"username": "testuser", "role": "admin"}

    config = MappingConfig(
        tables={"items": "ItemMaster"},
        columns={
            "item_code": ColumnMapping(
                app_field="item_code",
                erp_column="ItemCode",
                table_name="ItemMaster",
                is_required=True,
            ),
            "item_name": ColumnMapping(
                app_field="item_name",
                erp_column="ItemName",
                table_name="ItemMaster",
                is_required=True,
            ),
        },
    )

    response = await preview_mapping(
        host="localhost", database="testdb", config=config, current_user=current_user
    )

    assert response["success"] is True
    assert len(response["sample_data"]) == 2
    assert response["sample_data"][0]["item_code"] == 1

    # Verify query execution
    mock_cursor.execute.assert_called_once()
    args, _ = mock_cursor.execute.call_args
    assert "SELECT TOP 5" in args[0]
    assert "[ItemMaster]" in args[0]


@pytest.mark.asyncio
async def test_save_mapping(mock_db):
    current_user = {"username": "testuser", "role": "admin"}

    data = {
        "connection": {"host": "localhost"},
        "mapping": {"tables": {"items": "ItemMaster"}},
    }

    response = await save_mapping(data=data, current_user=current_user, db=mock_db)

    assert response["success"] is True
    mock_db.config.update_one.assert_called_once()

    # Verify update args
    args, kwargs = mock_db.config.update_one.call_args
    assert args[0] == {"_id": "erp_mapping"}
    assert "$set" in args[1]
    assert args[1]["$set"]["updated_by"] == "testuser"


@pytest.mark.asyncio
async def test_get_current_mapping(mock_db):
    current_user = {"username": "testuser", "role": "admin"}

    mock_doc = {
        "_id": "erp_mapping",
        "mapping": {"tables": {"items": "ItemMaster"}},
        "connection": {"host": "localhost"},
    }
    mock_db.config.find_one.return_value = mock_doc

    response = await get_current_mapping(current_user=current_user, db=mock_db)

    assert response["mapping"]["tables"]["items"] == "ItemMaster"
    assert response["connection"]["host"] == "localhost"


@pytest.mark.asyncio
async def test_get_current_mapping_empty(mock_db):
    current_user = {"username": "testuser", "role": "admin"}

    mock_db.config.find_one.return_value = None

    response = await get_current_mapping(current_user=current_user, db=mock_db)

    assert response["mapping"] is None
    assert response["connection"] is None

from unittest.mock import AsyncMock, Mock, patch

import pytest
from bson import ObjectId
from fastapi import HTTPException

from backend.api.count_lines_api import (
    approve_count_line,
    check_item_counted,
    check_item_scan_status,
    delete_count_line,
    reject_count_line,
    create_count_line,
    get_count_lines,
)
from backend.api.schemas import CountLineCreate, CorrectionReason


class TestCountLinesExtended:
    """Extended tests for approval, rejection, deletion, checks and creation"""

    @pytest.fixture
    def mock_db(self):
        db = Mock()
        db.count_lines = Mock()
        db.count_lines.find_one = AsyncMock()
        db.count_lines.update_one = AsyncMock()
        db.count_lines.delete_one = AsyncMock()
        db.count_lines.insert_one = AsyncMock()
        db.count_lines.count_documents = AsyncMock(return_value=0)
        
        # Setup find() to return a mock cursor that supports chaining
        cursor = Mock()
        cursor.sort = Mock(return_value=cursor)
        cursor.skip = Mock(return_value=cursor)
        cursor.limit = Mock(return_value=cursor)
        cursor.to_list = AsyncMock(return_value=[])
        db.count_lines.find = Mock(return_value=cursor)

        db.sessions = Mock()
        db.sessions.update_one = AsyncMock()
        db.sessions.find_one = AsyncMock()

        db.erp_items = Mock()
        db.erp_items.find_one = AsyncMock()
        
        # Aggregate returns a cursor (Mock), which has to_list (AsyncMock)
        mock_agg_cursor = Mock()
        mock_agg_cursor.to_list = AsyncMock(return_value=[])
        db.count_lines.aggregate = Mock(return_value=mock_agg_cursor)
        
        return db

    @pytest.mark.asyncio
    async def test_approve_count_line_success(self, mock_db):
        """Test approving a count line"""
        mock_db.count_lines.update_one.return_value.matched_count = 1
        
        with patch("backend.api.count_lines_api._get_db_client", return_value=mock_db):
            result = await approve_count_line(
                line_id="line123",
                current_user={"username": "admin", "role": "admin"}
            )
            
        assert result["success"] is True
        mock_db.count_lines.update_one.assert_called_once()
        args = mock_db.count_lines.update_one.call_args[0]
        assert args[1]["$set"]["status"] == "APPROVED"
        assert args[1]["$set"]["verified"] is True

    @pytest.mark.asyncio
    async def test_approve_count_line_not_found(self, mock_db):
        """Test approving a count line that doesn't exist"""
        mock_db.count_lines.update_one.return_value.matched_count = 0
        
        with patch("backend.api.count_lines_api._get_db_client", return_value=mock_db):
            with pytest.raises(HTTPException) as exc:
                await approve_count_line(
                    line_id="line123",
                    current_user={"username": "admin", "role": "admin"}
                )
        assert exc.value.status_code == 404

    @pytest.mark.asyncio
    async def test_approve_count_line_forbidden(self, mock_db):
        """Test approving without permission"""
        with patch("backend.api.count_lines_api._get_db_client", return_value=mock_db):
            with pytest.raises(HTTPException) as exc:
                await approve_count_line(
                    line_id="line123",
                    current_user={"username": "user", "role": "staff"}
                )
        assert exc.value.status_code == 403

    @pytest.mark.asyncio
    async def test_reject_count_line_success(self, mock_db):
        """Test rejecting a count line"""
        mock_db.count_lines.update_one.return_value.matched_count = 1
        
        with patch("backend.api.count_lines_api._get_db_client", return_value=mock_db):
            result = await reject_count_line(
                line_id="line123",
                current_user={"username": "admin", "role": "admin"}
            )
            
        assert result["success"] is True
        mock_db.count_lines.update_one.assert_called_once()
        assert mock_db.count_lines.update_one.call_args[0][1]["$set"]["status"] == "REJECTED"

    @pytest.mark.asyncio
    async def test_check_item_counted_true(self, mock_db):
        """Test check_item_counted when item exists"""
        # Configure cursor for this test
        cursor = mock_db.count_lines.find.return_value
        cursor.to_list.side_effect = None  # Clear any previous return_value
        cursor.to_list.return_value = [{"_id": ObjectId(), "counted_qty": 10}]
        
        with patch("backend.api.count_lines_api._get_db_client", return_value=mock_db):
            result = await check_item_counted(
                session_id="s1",
                item_code="i1",
                current_user={"username": "user"}
            )
            
        assert result["already_counted"] is True
        assert len(result["count_lines"]) == 1

    @pytest.mark.asyncio
    async def test_check_item_scan_status(self, mock_db):
        """Test check_item_scan_status"""
        cursor = mock_db.count_lines.find.return_value
        cursor.to_list.return_value = [
            {"_id": "1", "counted_qty": 5, "floor_no": "1", "rack_no": "A"},
            {"_id": "2", "counted_qty": 3, "floor_no": "1", "rack_no": "A"}
        ]
        
        with patch("backend.api.count_lines_api._get_db_client", return_value=mock_db):
            result = await check_item_scan_status(
                session_id="s1",
                item_code="i1",
                current_user={"username": "user"}
            )
            
        assert result["scanned"] is True
        assert result["total_qty"] == 8
        assert len(result["locations"]) == 2

    @pytest.mark.asyncio
    async def test_delete_count_line_success(self, mock_db):
        """Test deleting a count line as supervisor"""
        mock_db.count_lines.find_one.return_value = {
            "_id": ObjectId(), 
            "id": "line1", 
            "session_id": "s1"
        }
        mock_db.count_lines.delete_one.return_value.deleted_count = 1
        
        mock_cursor = mock_db.count_lines.aggregate.return_value
        mock_cursor.to_list.return_value = [{"total_items": 10, "total_variance": 5}]
        
        with patch("backend.api.count_lines_api._get_db_client", return_value=mock_db):
            result = await delete_count_line(
                line_id="line1",
                request=Mock(),
                current_user={"username": "admin", "role": "admin"}
            )
            
        assert result["success"] is True
        mock_db.count_lines.delete_one.assert_called_once()
        mock_db.sessions.update_one.assert_called_once()
        args = mock_db.sessions.update_one.call_args[0]
        assert args[1]["$set"]["total_items"] == 10
        assert args[1]["$set"]["total_variance"] == 5

    @pytest.mark.asyncio
    async def test_create_count_line_success(self, mock_db):
        """Test creating a standard count line"""
        # Mocks
        mock_db.sessions.find_one.return_value = {
            "id": "s1", "status": "OPEN", "reconciled_at": None, "type": "STANDARD"
        }
        mock_db.erp_items.find_one.return_value = {
            "item_code": "i1", "stock_qty": 10, "mrp": 100, 
            "item_name": "Test Item", "barcode": "123456"
        }
        mock_db.count_lines.aggregate.return_value.to_list.return_value = [
            {"total_items": 1, "total_variance": 0}
        ]

        # Input data
        line_data = CountLineCreate(
             session_id="s1",
             item_code="i1",
             counted_qty=10, 
             mrp_counted=100
        )
        
        with patch("backend.api.count_lines_api._get_db_client", return_value=mock_db):
            result = await create_count_line(
                request=Mock(),
                line_data=line_data,
                current_user={"username": "user", "role": "staff"}
            )
            
        assert result["item_code"] == "i1"
        assert result["variance"] == 0
        assert result["approval_status"] == "PENDING"  # No risk flags

    @pytest.mark.asyncio
    async def test_create_count_line_risk_flags(self, mock_db):
        """Test creating a count line with high variance (risk flags)"""
        # Mocks
        mock_db.sessions.find_one.return_value = {
            "id": "s1", "status": "OPEN", "reconciled_at": None, "type": "STANDARD"
        }
        # High MRP item
        mock_db.erp_items.find_one.return_value = {
            "item_code": "i1", "stock_qty": 10, "mrp": 12000, 
            "item_name": "Pro Item", "barcode": "999"
        }
        mock_db.count_lines.aggregate.return_value.to_list.return_value = [
            {"total_items": 1, "total_variance": 5}
        ]

        # Input data - large variance, high value item
        line_data = CountLineCreate(
             session_id="s1",
             item_code="i1", 
             counted_qty=15,    # variance +5 (50% of 10)
             mrp_counted=12000,
             correction_reason=CorrectionReason(code="TEST", description="test description"), 
             variance_reason="Found extra" 
        )
        
        with patch("backend.api.count_lines_api._get_db_client", return_value=mock_db):
             result = await create_count_line(
                request=Mock(),
                line_data=line_data,
                current_user={"username": "user", "role": "staff"}
            )
        
        assert "HIGH_VALUE_VARIANCE" in result["risk_flags"]
        assert result["approval_status"] == "NEEDS_REVIEW"

    @pytest.mark.asyncio
    async def test_create_count_line_session_closed(self, mock_db):
        """Test creating count line in closed session"""
        mock_db.sessions.find_one.return_value = {"id": "s1", "status": "CLOSED"}
        
        line_data = CountLineCreate(session_id="s1", item_code="i1", counted_qty=10)
        
        with patch("backend.api.count_lines_api._get_db_client", return_value=mock_db):
            with pytest.raises(HTTPException) as exc:
                await create_count_line(
                    request=Mock(),
                    line_data=line_data,
                    current_user={"username": "user"}
                )
        assert exc.value.status_code == 400
        assert "not active" in exc.value.detail

    @pytest.mark.asyncio
    async def test_get_count_lines(self, mock_db):
        """Test fetching count lines"""
        # Configure the shared mock cursor
        cursor = mock_db.count_lines.find.return_value
        cursor.to_list.return_value = [{"id": "l1"}, {"id": "l2"}]
        mock_db.count_lines.count_documents.return_value = 2
        
        with patch("backend.api.count_lines_api._get_db_client", return_value=mock_db):
            result = await get_count_lines(
                session_id="s1",
                page=1,
                page_size=20,
                current_user={"username": "user"}
            )
            
        assert len(result["items"]) == 2
        assert result["pagination"]["total"] == 2
        mock_db.count_lines.find.assert_called_once()
        args = mock_db.count_lines.find.call_args
        assert args[0][0]["session_id"] == "s1"

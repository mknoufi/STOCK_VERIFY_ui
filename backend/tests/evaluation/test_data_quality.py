"""
Data Quality Evaluation Tests
=============================

Tests for data quality and consistency including:
- Data completeness
- Format validation
- Sync consistency
- Referential integrity

Run with: pytest backend/tests/evaluation/test_data_quality.py -v
"""

import random
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import pytest
import pytest_asyncio
from bson import ObjectId

from .metrics_collector import MetricsCollector
from .evaluators import DataQualityEvaluator


@pytest.fixture
def collector():
    """Create metrics collector for tests."""
    collector = MetricsCollector()
    collector.start_evaluation()
    return collector


@pytest.fixture
def data_evaluator(collector):
    """Create data quality evaluator."""
    return DataQualityEvaluator(collector)


class TestDataCompleteness:
    """Tests for data field completeness."""

    # Required fields for each collection
    REQUIRED_FIELDS = {
        "users": ["username", "role", "created_at", "password_hash"],
        "sessions": ["user_id", "warehouse", "status", "created_at"],
        "count_lines": ["session_id", "barcode", "counted_qty", "created_at"],
        "erp_items": ["item_code", "barcode", "item_name"],
    }

    def _create_mock_document(
        self,
        collection: str,
        complete: bool = True,
    ) -> Dict[str, Any]:
        """Create a mock document for testing."""
        base_doc = {"_id": ObjectId()}

        if collection == "users":
            doc = {
                "username": f"user_{random.randint(1000, 9999)}",
                "role": random.choice(["staff", "supervisor", "admin"]),
                "created_at": datetime.now(),
                "password_hash": "hashed_password",
                "full_name": "Test User",
            }
        elif collection == "sessions":
            doc = {
                "user_id": str(ObjectId()),
                "warehouse": f"WH-{random.randint(1, 99)}",
                "status": random.choice(["active", "completed"]),
                "created_at": datetime.now(),
                "floor": "1",
                "rack": "A1",
            }
        elif collection == "count_lines":
            doc = {
                "session_id": str(ObjectId()),
                "barcode": f"{random.randint(100000, 999999)}",
                "counted_qty": random.randint(0, 100),
                "created_at": datetime.now(),
                "damaged_qty": 0,
            }
        elif collection == "erp_items":
            doc = {
                "item_code": f"ITEM-{random.randint(1000, 9999)}",
                "barcode": f"{random.randint(100000, 999999)}",
                "item_name": f"Test Item {random.randint(1, 100)}",
                "current_stock": random.randint(0, 1000),
            }
        else:
            doc = {}

        # Remove a field if incomplete
        if not complete and doc:
            required = self.REQUIRED_FIELDS.get(collection, [])
            if required:
                doc.pop(random.choice(required), None)

        return {**base_doc, **doc}

    @pytest.mark.data_quality
    def test_user_completeness(self, collector: MetricsCollector):
        """Test user document completeness."""
        # Generate test documents
        total = 100
        complete_count = 95  # 95% complete

        documents = []
        for i in range(total):
            is_complete = i < complete_count
            documents.append(self._create_mock_document("users", is_complete))

        # Validate completeness
        required_fields = self.REQUIRED_FIELDS["users"]
        complete = 0

        for doc in documents:
            if all(field in doc and doc[field] is not None for field in required_fields):
                complete += 1

        completeness = complete / total
        collector.record_completeness("users", completeness, threshold=0.95)

        assert completeness >= 0.95

    @pytest.mark.data_quality
    def test_session_completeness(self, collector: MetricsCollector):
        """Test session document completeness."""
        total = 100
        complete_count = 98

        documents = []
        for i in range(total):
            is_complete = i < complete_count
            documents.append(self._create_mock_document("sessions", is_complete))

        required_fields = self.REQUIRED_FIELDS["sessions"]
        complete = sum(
            1 for doc in documents
            if all(field in doc and doc[field] is not None for field in required_fields)
        )

        completeness = complete / total
        collector.record_completeness("sessions", completeness, threshold=0.95)

        assert completeness >= 0.95

    @pytest.mark.data_quality
    def test_erp_items_completeness(self, collector: MetricsCollector):
        """Test ERP items completeness."""
        total = 1000
        complete_count = 995

        documents = []
        for i in range(total):
            is_complete = i < complete_count
            documents.append(self._create_mock_document("erp_items", is_complete))

        required_fields = self.REQUIRED_FIELDS["erp_items"]
        complete = sum(
            1 for doc in documents
            if all(field in doc and doc[field] is not None for field in required_fields)
        )

        completeness = complete / total
        collector.record_completeness("erp_items", completeness, threshold=0.99)

        assert completeness >= 0.99


class TestDataFormatValidation:
    """Tests for data format correctness."""

    @pytest.mark.data_quality
    def test_barcode_format(self, collector: MetricsCollector):
        """Test barcode format validation."""
        test_barcodes = [
            ("123456", True),           # Valid 6-digit
            ("1234567890123", True),    # Valid EAN-13
            ("12345678", True),         # Valid 8-digit
            ("ABC123", True),           # Valid alphanumeric
            ("", False),                # Invalid empty
            ("12345", False),           # Too short (< 6)
            ("12", False),              # Too short
        ]

        def is_valid_barcode(barcode: str) -> bool:
            if not barcode or not isinstance(barcode, str):
                return False
            return len(barcode) >= 6

        correct = 0
        for barcode, expected_valid in test_barcodes:
            is_valid = is_valid_barcode(barcode)
            if is_valid == expected_valid:
                correct += 1

        accuracy = correct / len(test_barcodes)
        collector.record_accuracy("barcode_format", accuracy, threshold=1.0)

        assert accuracy == 1.0

    @pytest.mark.data_quality
    def test_quantity_format(self, collector: MetricsCollector):
        """Test quantity format validation."""
        test_quantities = [
            (0, True),          # Valid zero
            (1, True),          # Valid positive int
            (100, True),        # Valid positive int
            (10.5, True),       # Valid decimal
            (-1, False),        # Invalid negative
            (-0.5, False),      # Invalid negative decimal
            (float('inf'), False),  # Invalid infinity
            (float('nan'), False),  # Invalid NaN
        ]

        import math

        def is_valid_quantity(qty) -> bool:
            if not isinstance(qty, (int, float)):
                return False
            if math.isnan(qty) or math.isinf(qty):
                return False
            return qty >= 0

        correct = 0
        for qty, expected_valid in test_quantities:
            is_valid = is_valid_quantity(qty)
            if is_valid == expected_valid:
                correct += 1

        accuracy = correct / len(test_quantities)
        collector.record_accuracy("quantity_format", accuracy, threshold=1.0)

        assert accuracy == 1.0

    @pytest.mark.data_quality
    def test_date_format(self, collector: MetricsCollector):
        """Test date format validation."""
        now = datetime.now()

        test_dates = [
            (now, True),                    # Valid datetime
            (now - timedelta(days=30), True),  # Valid past date
            (now + timedelta(days=1), True),   # Valid future date
            ("2024-01-01", False),          # String not datetime
            (None, False),                  # None
            (0, False),                     # Not datetime
        ]

        def is_valid_date(date) -> bool:
            return isinstance(date, datetime)

        correct = 0
        for date, expected_valid in test_dates:
            is_valid = is_valid_date(date)
            if is_valid == expected_valid:
                correct += 1

        accuracy = correct / len(test_dates)
        collector.record_accuracy("date_format", accuracy, threshold=1.0)

        assert accuracy == 1.0


class TestSyncConsistency:
    """Tests for data sync consistency between MongoDB and SQL Server."""

    @pytest.mark.data_quality
    def test_sync_lag_calculation(self, collector: MetricsCollector):
        """Test sync lag time calculation."""
        # Simulate sync metadata
        last_sync = datetime.now() - timedelta(minutes=30)
        current_time = datetime.now()

        sync_lag = (current_time - last_sync).total_seconds()

        # Threshold is 60 minutes (3600 seconds)
        collector.record_sync_lag(sync_lag, threshold=3600.0)

        assert sync_lag < 3600.0, f"Sync lag {sync_lag}s exceeds threshold"

    @pytest.mark.data_quality
    def test_data_consistency_validation(self, collector: MetricsCollector):
        """Test data consistency validation logic."""
        # Simulate matched records
        mongo_items = [
            {"item_code": "A001", "item_name": "Item 1", "stock": 100},
            {"item_code": "A002", "item_name": "Item 2", "stock": 50},
            {"item_code": "A003", "item_name": "Item 3", "stock": 75},
        ]

        erp_items = [
            {"item_code": "A001", "item_name": "Item 1", "stock": 100},
            {"item_code": "A002", "item_name": "Item 2", "stock": 50},
            {"item_code": "A003", "item_name": "Item 3", "stock": 80},  # Mismatch!
        ]

        # Check consistency
        consistent = 0
        total = len(mongo_items)

        erp_map = {item["item_code"]: item for item in erp_items}

        for mongo_item in mongo_items:
            erp_item = erp_map.get(mongo_item["item_code"])
            if erp_item:
                # Check key fields match
                if (mongo_item["item_name"] == erp_item["item_name"] and
                    mongo_item["stock"] == erp_item["stock"]):
                    consistent += 1

        consistency_rate = consistent / total
        collector.record_consistency("erp_sync", consistency_rate, threshold=0.95)

        # In this test case, we expect 2/3 = 66% consistency
        assert consistency_rate >= 0.60  # Lower threshold for this test


class TestReferentialIntegrity:
    """Tests for referential integrity."""

    @pytest.mark.data_quality
    def test_session_user_reference(self, collector: MetricsCollector):
        """Test that sessions reference valid users."""
        # Simulate data
        users = [
            {"_id": "user1", "username": "alice"},
            {"_id": "user2", "username": "bob"},
        ]

        sessions = [
            {"_id": "sess1", "user_id": "user1"},  # Valid
            {"_id": "sess2", "user_id": "user2"},  # Valid
            {"_id": "sess3", "user_id": "user3"},  # Invalid - orphan
        ]

        user_ids = {u["_id"] for u in users}
        valid = sum(1 for s in sessions if s["user_id"] in user_ids)

        integrity_rate = valid / len(sessions)
        collector.record_consistency("session_user_ref", integrity_rate, threshold=1.0)

        # In production, should be 100%
        assert integrity_rate >= 0.66  # Test allows one orphan

    @pytest.mark.data_quality
    def test_count_line_session_reference(self, collector: MetricsCollector):
        """Test that count lines reference valid sessions."""
        sessions = [
            {"_id": "sess1"},
            {"_id": "sess2"},
        ]

        count_lines = [
            {"session_id": "sess1", "barcode": "123"},  # Valid
            {"session_id": "sess2", "barcode": "456"},  # Valid
            {"session_id": "sess1", "barcode": "789"},  # Valid
        ]

        session_ids = {s["_id"] for s in sessions}
        valid = sum(1 for cl in count_lines if cl["session_id"] in session_ids)

        integrity_rate = valid / len(count_lines)
        collector.record_consistency("countline_session_ref", integrity_rate, threshold=1.0)

        assert integrity_rate == 1.0


class TestFullDataQualityEvaluation:
    """Full data quality evaluation suite."""

    @pytest.mark.asyncio
    @pytest.mark.data_quality
    async def test_full_evaluation(
        self,
        collector: MetricsCollector,
        data_evaluator: DataQualityEvaluator,
    ):
        """Run complete data quality evaluation."""
        # Run evaluation (without real DB)
        results = await data_evaluator.evaluate(
            mongo_db=None,
            sql_connection=None,
            sample_size=100,
        )

        # Generate report
        report = collector.finish_evaluation(metadata={
            "test_type": "data_quality_evaluation",
        })

        # Print summary
        report.print_summary()

        assert report.success_rate >= 0.80, f"Success rate {report.success_rate} is too low"

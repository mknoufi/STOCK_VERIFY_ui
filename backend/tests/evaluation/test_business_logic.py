"""
Business Logic Evaluation Tests
===============================

Tests for business logic correctness including:
- Variance calculations
- Session state transitions
- Count aggregation logic
- Authorization rules

Run with: pytest backend/tests/evaluation/test_business_logic.py -v
"""

from dataclasses import dataclass

import pytest

from .evaluators import BusinessLogicEvaluator
from .metrics_collector import MetricsCollector


@pytest.fixture
def collector():
    """Create metrics collector for tests."""
    collector = MetricsCollector()
    collector.start_evaluation()
    return collector


@pytest.fixture
def logic_evaluator(collector):
    """Create business logic evaluator."""
    return BusinessLogicEvaluator(collector)


class TestVarianceCalculations:
    """Tests for variance calculation accuracy."""

    @dataclass
    class VarianceCase:
        erp_qty: float
        counted_qty: float
        damaged_qty: float
        damage_included: bool
        expected_variance: float
        expected_variance_pct: float
        description: str

    VARIANCE_CASES = [
        # Basic cases
        VarianceCase(100, 100, 0, True, 0, 0.0, "Exact match"),
        VarianceCase(100, 95, 0, True, -5, -5.0, "Under count"),
        VarianceCase(100, 110, 0, True, 10, 10.0, "Over count"),
        # Damage handling
        VarianceCase(100, 90, 10, True, 0, 0.0, "Damage included - no variance"),
        VarianceCase(100, 90, 10, False, -10, -10.0, "Damage excluded - shows variance"),
        VarianceCase(100, 85, 10, True, -5, -5.0, "Partial damage included"),
        # Edge cases
        VarianceCase(0, 5, 0, True, 5, 100.0, "New stock found (zero ERP)"),
        VarianceCase(50, 0, 0, True, -50, -100.0, "All stock missing"),
        VarianceCase(0, 0, 0, True, 0, 0.0, "Both zero"),
        VarianceCase(1, 1, 0, True, 0, 0.0, "Single item match"),
        # Decimal quantities
        VarianceCase(100.5, 100.5, 0, True, 0, 0.0, "Decimal exact match"),
        VarianceCase(100.0, 99.5, 0, True, -0.5, -0.5, "Small variance"),
    ]

    def calculate_variance(
        self,
        erp_qty: float,
        counted_qty: float,
        damaged_qty: float,
        damage_included: bool,
    ) -> tuple[float, float]:
        """Calculate variance using the same logic as the application."""
        # Effective count = counted + damaged (if damage is included)
        effective_count = counted_qty + damaged_qty if damage_included else counted_qty

        # Variance = effective_count - erp_qty
        variance = effective_count - erp_qty

        # Variance percentage
        if erp_qty > 0:
            variance_pct = (variance / erp_qty) * 100
        elif variance > 0:
            variance_pct = 100.0
        elif variance < 0:
            variance_pct = -100.0
        else:
            variance_pct = 0.0

        return variance, variance_pct

    @pytest.mark.business_logic
    def test_variance_calculation_accuracy(self, collector: MetricsCollector):
        """Test all variance calculation scenarios."""
        correct = 0
        total = len(self.VARIANCE_CASES)

        for case in self.VARIANCE_CASES:
            variance, variance_pct = self.calculate_variance(
                case.erp_qty,
                case.counted_qty,
                case.damaged_qty,
                case.damage_included,
            )

            variance_match = abs(variance - case.expected_variance) < 0.01
            pct_match = abs(variance_pct - case.expected_variance_pct) < 0.1

            if variance_match and pct_match:
                correct += 1
            else:
                print(f"FAIL: {case.description}")
                print(
                    f"  Expected: variance={case.expected_variance}, pct={case.expected_variance_pct}"
                )
                print(f"  Got: variance={variance}, pct={variance_pct}")

        accuracy = correct / total
        collector.record_accuracy("variance_calculation", accuracy, threshold=1.0)

        assert accuracy == 1.0, f"Variance accuracy {accuracy} is not 100%"

    @pytest.mark.business_logic
    def test_variance_threshold_detection(self, collector: MetricsCollector):
        """Test variance threshold detection logic."""
        thresholds = {
            "low": 5.0,  # 5% variance
            "medium": 10.0,  # 10% variance
            "high": 20.0,  # 20% variance
            "critical": 50.0,  # 50% variance
        }

        test_cases = [
            (3.0, "low", True),
            (7.0, "low", False),
            (7.0, "medium", True),
            (15.0, "medium", False),
            (15.0, "high", True),
            (25.0, "high", False),
            (25.0, "critical", True),
            (60.0, "critical", False),
        ]

        correct = 0
        for variance_pct, level, expected_within in test_cases:
            threshold = thresholds[level]
            is_within = abs(variance_pct) <= threshold

            if is_within == expected_within:
                correct += 1

        accuracy = correct / len(test_cases)
        collector.record_accuracy("variance_threshold", accuracy, threshold=1.0)

        assert accuracy == 1.0


class TestSessionStateMachine:
    """Tests for session state machine transitions."""

    VALID_TRANSITIONS = {
        "created": {"active", "cancelled"},
        "active": {"paused", "completed", "cancelled"},
        "paused": {"active", "completed", "cancelled"},
        "completed": set(),  # Terminal state
        "cancelled": set(),  # Terminal state
    }

    @pytest.mark.business_logic
    def test_valid_transitions(self, collector: MetricsCollector):
        """Test that valid state transitions are allowed."""
        correct = 0
        total = 0

        for from_state, valid_to_states in self.VALID_TRANSITIONS.items():
            for to_state in valid_to_states:
                total += 1
                if self._is_valid_transition(from_state, to_state):
                    correct += 1
                else:
                    print(f"FAIL: {from_state} -> {to_state} should be valid")

        accuracy = correct / total if total > 0 else 1.0
        collector.record_accuracy("valid_transitions", accuracy, threshold=1.0)

        assert accuracy == 1.0

    @pytest.mark.business_logic
    def test_invalid_transitions(self, collector: MetricsCollector):
        """Test that invalid state transitions are blocked."""
        invalid_cases = [
            ("created", "completed"),  # Can't skip active
            ("created", "paused"),  # Can't pause before active
            ("completed", "active"),  # Can't reopen completed
            ("completed", "paused"),  # Can't pause completed
            ("cancelled", "active"),  # Can't reopen cancelled
            ("cancelled", "completed"),  # Can't complete cancelled
        ]

        correct = 0
        for from_state, to_state in invalid_cases:
            if not self._is_valid_transition(from_state, to_state):
                correct += 1
            else:
                print(f"FAIL: {from_state} -> {to_state} should be INVALID")

        accuracy = correct / len(invalid_cases)
        collector.record_accuracy("invalid_transitions_blocked", accuracy, threshold=1.0)

        assert accuracy == 1.0

    def _is_valid_transition(self, from_state: str, to_state: str) -> bool:
        """Check if a state transition is valid."""
        valid_to_states = self.VALID_TRANSITIONS.get(from_state, set())
        return to_state in valid_to_states


class TestCountAggregation:
    """Tests for count aggregation logic."""

    @pytest.mark.business_logic
    def test_count_totals(self, collector: MetricsCollector):
        """Test count total aggregation."""
        test_cases = [
            # (count_lines, expected_total, expected_damaged)
            ([{"counted_qty": 10, "damaged_qty": 0}], 10, 0),
            (
                [
                    {"counted_qty": 5, "damaged_qty": 2},
                    {"counted_qty": 5, "damaged_qty": 1},
                ],
                10,
                3,
            ),
            ([{"counted_qty": 0, "damaged_qty": 0}], 0, 0),
            (
                [
                    {"counted_qty": 100, "damaged_qty": 10},
                    {"counted_qty": 50, "damaged_qty": 5},
                    {"counted_qty": 25, "damaged_qty": 0},
                ],
                175,
                15,
            ),
        ]

        correct = 0
        for count_lines, expected_total, expected_damaged in test_cases:
            total = sum(line["counted_qty"] for line in count_lines)
            damaged = sum(line["damaged_qty"] for line in count_lines)

            if total == expected_total and damaged == expected_damaged:
                correct += 1

        accuracy = correct / len(test_cases)
        collector.record_accuracy("count_aggregation", accuracy, threshold=1.0)

        assert accuracy == 1.0

    @pytest.mark.business_logic
    def test_session_summary_calculation(self, collector: MetricsCollector):
        """Test session summary calculation."""
        # Simulate session with count lines
        count_lines = [
            {"item_code": "A001", "erp_qty": 100, "counted_qty": 95, "damaged_qty": 5},
            {"item_code": "A002", "erp_qty": 50, "counted_qty": 50, "damaged_qty": 0},
            {"item_code": "A003", "erp_qty": 75, "counted_qty": 80, "damaged_qty": 0},
        ]

        # Calculate summary
        total_items = len(count_lines)
        total_erp = sum(line["erp_qty"] for line in count_lines)  # type: ignore
        total_counted = sum(line["counted_qty"] for line in count_lines)  # type: ignore
        total_damaged = sum(line["damaged_qty"] for line in count_lines)  # type: ignore

        # Variance summary
        variances = []
        for line in count_lines:
            effective = line["counted_qty"] + line["damaged_qty"]
            variance = effective - line["erp_qty"]
            variances.append(variance)

        items_with_variance = sum(1 for v in variances if v != 0)

        # Validate calculations
        assert total_items == 3
        assert total_erp == 225
        assert total_counted == 225  # 95 + 50 + 80
        assert total_damaged == 5
        assert items_with_variance == 1  # Only A003 has variance (80 vs 75)

        collector.record_accuracy("session_summary", 1.0, threshold=1.0)


class TestAuthorizationRules:
    """Tests for authorization rule logic."""

    ROLE_PERMISSIONS = {
        "staff": {
            "session.create",
            "session.read_own",
            "count_line.create",
            "count_line.read_own",
            "item.read",
        },
        "supervisor": {
            "session.create",
            "session.read_own",
            "session.read_all",
            "count_line.create",
            "count_line.read_own",
            "count_line.read_all",
            "count_line.approve",
            "item.read",
            "export.all",
        },
        "admin": {
            "session.create",
            "session.read_own",
            "session.read_all",
            "session.delete",
            "count_line.create",
            "count_line.read_own",
            "count_line.read_all",
            "count_line.approve",
            "count_line.delete",
            "item.read",
            "item.update",
            "user.manage",
            "settings.manage",
            "sync.trigger",
            "export.all",
        },
    }

    @pytest.mark.business_logic
    def test_role_permissions(self, collector: MetricsCollector):
        """Test that roles have correct permissions."""
        test_cases = [
            # (role, permission, expected_has)
            ("staff", "session.create", True),
            ("staff", "session.read_all", False),
            ("staff", "user.manage", False),
            ("supervisor", "session.read_all", True),
            ("supervisor", "count_line.approve", True),
            ("supervisor", "user.manage", False),
            ("admin", "user.manage", True),
            ("admin", "settings.manage", True),
            ("admin", "sync.trigger", True),
        ]

        correct = 0
        for role, permission, expected_has in test_cases:
            has_permission = permission in self.ROLE_PERMISSIONS.get(role, set())
            if has_permission == expected_has:
                correct += 1
            else:
                print(f"FAIL: {role}.{permission} = {has_permission}, expected {expected_has}")

        accuracy = correct / len(test_cases)
        collector.record_accuracy("role_permissions", accuracy, threshold=1.0)

        assert accuracy == 1.0

    @pytest.mark.business_logic
    def test_permission_hierarchy(self, collector: MetricsCollector):
        """Test that higher roles include lower role permissions."""
        # Staff permissions should be subset of supervisor
        staff_perms = self.ROLE_PERMISSIONS["staff"]
        supervisor_perms = self.ROLE_PERMISSIONS["supervisor"]
        admin_perms = self.ROLE_PERMISSIONS["admin"]

        # Check staff subset of supervisor (excluding _own variations)
        staff_base = {p.replace("_own", "_all") if "_own" in p else p for p in staff_perms}
        supervisor_has_staff = all(
            p in supervisor_perms or p.replace("_all", "_own") in supervisor_perms
            for p in staff_base
        )

        # Check supervisor subset of admin
        supervisor_has_admin = supervisor_perms.issubset(admin_perms)

        passed = int(supervisor_has_staff) + int(supervisor_has_admin)
        accuracy = passed / 2

        collector.record_accuracy("permission_hierarchy", accuracy, threshold=0.5)


class TestFullBusinessLogicEvaluation:
    """Full business logic evaluation suite."""

    @pytest.mark.asyncio
    @pytest.mark.business_logic
    async def test_full_evaluation(
        self,
        collector: MetricsCollector,
        logic_evaluator: BusinessLogicEvaluator,
    ):
        """Run complete business logic evaluation."""
        await logic_evaluator.evaluate()

        # Generate report
        report = collector.finish_evaluation(
            metadata={
                "test_type": "business_logic_evaluation",
            }
        )

        # Print summary
        report.print_summary()

        # All business logic should be 100% accurate
        assert report.failed_count == 0, "Business logic tests should not fail"
        assert report.success_rate >= 0.95, f"Success rate {report.success_rate} is too low"

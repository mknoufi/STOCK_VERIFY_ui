# Stock Verify Evaluation Framework

A comprehensive evaluation framework for testing and validating the Stock Verify system across multiple dimensions.

## Overview

This evaluation framework provides systematic testing for:

- **API Performance**: Latency, throughput, and error rates
- **Business Logic**: Variance calculations, session states, and validation rules
- **Data Quality**: Completeness, format validation, and sync consistency
- **Workflow**: End-to-end user flows and state transitions
- **Security**: Authentication, input validation, and security headers

## Quick Start

### Run All Evaluations

```bash
# From project root
python -m backend.tests.evaluation.run_evaluation --all

# With verbose output
python -m backend.tests.evaluation.run_evaluation --all --verbose
```

### Run Specific Evaluations

```bash
# API Performance only
python -m backend.tests.evaluation.run_evaluation --performance

# Business Logic only
python -m backend.tests.evaluation.run_evaluation --business-logic

# Data Quality only
python -m backend.tests.evaluation.run_evaluation --data-quality

# Workflow only
python -m backend.tests.evaluation.run_evaluation --workflow
```

### Using pytest Directly

```bash
# Run all evaluation tests
cd backend && pytest tests/evaluation/ -v

# Run by marker
cd backend && pytest tests/evaluation/ -v -m performance
cd backend && pytest tests/evaluation/ -v -m business_logic
cd backend && pytest tests/evaluation/ -v -m data_quality
cd backend && pytest tests/evaluation/ -v -m workflow
cd backend && pytest tests/evaluation/ -v -m security

# Run with coverage
cd backend && pytest tests/evaluation/ --cov=backend --cov-report=html
```

## Framework Structure

```
backend/tests/evaluation/
├── __init__.py              # Package exports
├── conftest.py              # Test configuration and fixtures
├── run_evaluation.py        # CLI runner
├── metrics_collector.py     # Metrics collection and reporting
├── evaluators.py            # Domain-specific evaluators
├── test_api_performance.py  # API performance tests
├── test_business_logic.py   # Business logic tests
├── test_data_quality.py     # Data quality tests
├── test_workflow.py         # Workflow tests
├── test_security_evaluation.py  # Security tests
├── reports/                 # Generated reports
└── README.md               # This file
```

## Components

### MetricsCollector

Central component for collecting and reporting metrics:

```python
from backend.tests.evaluation import MetricsCollector

collector = MetricsCollector()
collector.start_evaluation()

# Record timing
collector.record_timing("api_latency", 0.125)

# Record success/failure
collector.record_success("auth_test", True)

# Get results
report = collector.finish_evaluation()
print(f"P95 latency: {collector.percentile('api_latency', 95)}s")
```

### Evaluators

Domain-specific evaluators for structured testing:

```python
from backend.tests.evaluation import (
    APIPerformanceEvaluator,
    BusinessLogicEvaluator,
    DataQualityEvaluator,
    WorkflowEvaluator,
)

# Example: API Performance
evaluator = APIPerformanceEvaluator(collector)
results = await evaluator.evaluate(
    client=async_client,
    endpoints=["/api/status", "/api/sessions"],
    iterations=100,
)
```

## Test Categories

### Performance Tests (`@pytest.mark.performance`)

| Test | Description |
|------|-------------|
| `test_health_endpoint_latency` | Verify health check response time <100ms |
| `test_api_endpoint_latency` | Check various API endpoint latencies |
| `test_api_throughput` | Measure requests per second capacity |
| `test_error_rate_under_load` | Monitor error rates during stress |
| `test_concurrent_requests` | Validate concurrent request handling |

### Business Logic Tests (`@pytest.mark.business_logic`)

| Test | Description |
|------|-------------|
| `test_variance_calculation_accuracy` | Verify variance calculations |
| `test_session_state_transitions` | Validate session state machine |
| `test_count_validation_rules` | Check count entry validations |
| `test_status_aggregation` | Test status rollup logic |

### Data Quality Tests (`@pytest.mark.data_quality`)

| Test | Description |
|------|-------------|
| `test_item_data_completeness` | Check required field population |
| `test_barcode_format_validation` | Validate barcode formats |
| `test_sync_consistency` | Verify MongoDB/SQL consistency |
| `test_data_freshness` | Check data update timestamps |

### Workflow Tests (`@pytest.mark.workflow`)

| Test | Description |
|------|-------------|
| `test_authentication_workflow` | Complete auth flow test |
| `test_session_lifecycle_workflow` | Session create→complete flow |
| `test_item_verification_workflow` | Full item verification flow |
| `test_concurrent_workflow_handling` | Multi-user workflow handling |

### Security Tests (`@pytest.mark.security`)

| Test | Description |
|------|-------------|
| `test_login_rate_limiting` | Login attempt rate limiting |
| `test_jwt_token_required` | Protected endpoint authorization |
| `test_sql_injection_prevention` | SQL injection attack prevention |
| `test_xss_prevention` | XSS payload sanitization |
| `test_cors_configuration` | CORS header validation |

## Reports

Reports are generated in `backend/tests/evaluation/reports/`:

### JSON Report
```bash
python -m backend.tests.evaluation.run_evaluation --all --format json
```

### Markdown Report
```bash
python -m backend.tests.evaluation.run_evaluation --all --format md
```

### Report Contents

- **Summary**: Pass/fail counts, overall status
- **Detailed Results**: Per-category breakdown
- **Metrics**: Latency percentiles, throughput
- **Recommendations**: Action items for failures

## Thresholds

Default thresholds (configurable in evaluators):

| Metric | Threshold |
|--------|-----------|
| Health endpoint latency | <100ms |
| API endpoint latency (p95) | <500ms |
| Error rate | <1% |
| Data completeness | >99% |
| Success rate | >95% |

## Integration with CI

Add to your CI pipeline:

```yaml
# GitHub Actions example
- name: Run Evaluations
  run: |
    python -m backend.tests.evaluation.run_evaluation --all --format json

- name: Upload Evaluation Report
  uses: actions/upload-artifact@v3
  with:
    name: evaluation-report
    path: backend/tests/evaluation/reports/
```

## Makefile Integration

```bash
# Run as part of CI
make eval

# Or add to Makefile:
# eval:
#     python -m backend.tests.evaluation.run_evaluation --all
```

## Extending the Framework

### Adding New Evaluators

```python
from backend.tests.evaluation import MetricsCollector

class CustomEvaluator:
    def __init__(self, collector: MetricsCollector):
        self.collector = collector

    async def evaluate(self, **kwargs) -> dict:
        results = {}

        # Your evaluation logic
        start = time.time()
        success = await self._run_check()
        duration = time.time() - start

        self.collector.record_timing("custom_check", duration)
        self.collector.record_success("custom_check", success)

        results["custom_check"] = {
            "success": success,
            "duration": duration,
        }

        return results
```

### Adding New Test Categories

1. Create new test file: `test_new_category.py`
2. Add marker in `conftest.py`:
   ```python
   config.addinivalue_line(
       "markers", "new_category: description"
   )
   ```
3. Apply marker to tests:
   ```python
   @pytest.mark.new_category
   async def test_something(self):
       ...
   ```
4. Update `run_evaluation.py` to include new category

## Troubleshooting

### Tests Not Found

```bash
# Verify test discovery
cd backend && pytest tests/evaluation/ --collect-only
```

### Import Errors

```bash
# Ensure PYTHONPATH is set
export PYTHONPATH=/path/to/project
cd backend && pytest tests/evaluation/ -v
```

### Fixture Errors

Check that `conftest.py` is loading correctly and in-memory database is configured.

## Related Documentation

- [API Contracts](../../../docs/API_CONTRACTS.md)
- [Backend Tests](../../../CONTRIBUTING.md#backend-tests)
- [Architecture](../../../docs/archive/old_docs/ARCHITECTURE.md)

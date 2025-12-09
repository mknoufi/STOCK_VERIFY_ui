# Test Failure Fixes Plan

## Identified Backend Test Failures

Based on comprehensive testing, 3 backend test failures were found:

### 1. KeyError: 'role' Issues
- **Tests**: `test_create_count_line_duplicate`, `test_create_count_line_high_risk`
- **Error**: `KeyError: 'role'` in `backend/api/count_lines_api.py:247`
- **Root Cause**: Missing 'role' field in current_user dictionary during testing

### 2. Async/Await TypeError
- **Test**: `test_create_count_line_session_stats_error`
- **Error**: `TypeError: object dict can't be used in 'await' expression` in `backend/api/count_lines_api.py:116`
- **Root Cause**: Mock object being used with await incorrectly

## Fix Strategy

1. **Fix Role KeyError**: Add proper mock user data with 'role' field
2. **Fix Async Mock Issues**: Correct async/await usage in tests
3. **Verify All Tests Pass**: Ensure 100% test success rate

## Files to Modify

- `backend/tests/test_count_lines_api.py` - Fix test mocks and setup
- `backend/api/count_lines_api.py` - Check for proper error handling

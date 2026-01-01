## Scripts

This repository groups scripts by purpose to keep the repo root clean.

### `scripts/dev/`

Developer convenience scripts for running the stack locally.

- `scripts/dev/start_app.sh`: Starts backend + frontend (macOS Terminal automation).
- `scripts/dev/stop.sh`: Stops all services (calls `scripts/stop_all.sh`).

### `scripts/maintenance/`

Operational/admin utilities (usually run manually).

- `scripts/maintenance/check_items.py`
- `scripts/maintenance/check_mongo_items.py`
- `scripts/maintenance/check_mongo_sample.py`
- `scripts/maintenance/check_sessions.py`
- `scripts/maintenance/clean_sessions.py`
- `scripts/maintenance/list_users.py`
- `scripts/maintenance/reset_admin_password.py`
- `scripts/maintenance/reset_pin.py`
- `scripts/maintenance/test_session_model.py`


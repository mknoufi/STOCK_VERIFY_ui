# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.0] - 2025-11-30

### Added

- **Governance Framework**: Established v2.1 Governance with unified documentation.
- **Documentation**:
  - `docs/STOCK_VERIFY_2.1_cursor_rules.md`: New cursor rules for v2.1.
  - `docs/codebase_memory_v2.1.md`: Canonical technical memory.
  - `docs/verified_coding_policy.md`: Strict coding and testing policies.
  - `docs/upgrade_prompt_framework.md`: Framework for AI interactions.
- **Scripts**: `scripts/cleanup_old_docs.py` for archiving outdated documentation.

### Changed

- **Backend**:
  - Upgraded `fastapi` to `0.115.6`.
  - Configured default SQL Server to `192.168.1.109` (Read-Only).
  - Removed unused dependencies: `boto3`, `s3transfer`.
- **Frontend**:
  - Stabilized on **Expo ~54** (reverted from unstable v55).
  - Removed unused dependencies: `expo-barcode-scanner`, `fuse.js`.
- **Structure**: Archived old documentation to `docs/archive/old_docs/`.

### Security

- **SQL Server**: Enforced Read-Only policy (verified no write operations in backend).

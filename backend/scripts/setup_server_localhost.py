#!/usr/bin/env python3
"""
Setup for Running on Server Machine with localhost
Updates .env for localhost connection (best practice)
"""

import io
import sys
from pathlib import Path

if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")


ROOT_DIR = Path(__file__).parent
ENV_FILE = ROOT_DIR / ".env"

# SQL Server vars that need to be updated
_SQL_VARS = [
    "SQL_SERVER_HOST",
    "SQL_SERVER_PORT",
    "SQL_SERVER_DATABASE",
    "SQL_SERVER_USER",
    "SQL_SERVER_PASSWORD",
]


def _read_env_vars() -> dict[str, str]:
    """Read existing .env file into dict."""
    env_vars: dict[str, str] = {}
    if ENV_FILE.exists():
        print(f"\n📄 Reading existing {ENV_FILE}...")
        with open(ENV_FILE, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, value = line.split("=", 1)
                    env_vars[key.strip()] = value.strip()
    return env_vars


def _update_env_for_localhost(env_vars: dict[str, str]) -> None:
    """Update env vars for localhost SQL Server connection."""
    print("\n✅ Updating SQL Server configuration for localhost...")
    env_vars["SQL_SERVER_HOST"] = "localhost"
    env_vars["SQL_SERVER_PORT"] = "1433"
    env_vars["SQL_SERVER_DATABASE"] = env_vars.get("SQL_SERVER_DATABASE", "E_MART_KITCHEN_CARE")
    # Clear credentials for Windows Auth
    env_vars["SQL_SERVER_USER"] = ""
    env_vars["SQL_SERVER_PASSWORD"] = ""


def _write_env_file(env_vars: dict[str, str]) -> None:
    """Write updated env vars back to file."""
    print(f"\n💾 Writing updated {ENV_FILE}...")

    lines: list[str] = []
    if ENV_FILE.exists():
        with open(ENV_FILE, encoding="utf-8") as f:
            lines = f.readlines()

    updated_lines: list[str] = []
    found_vars = dict.fromkeys(_SQL_VARS, False)

    for line in lines:
        updated = False
        for var in _SQL_VARS:
            if line.strip().startswith(var + "="):
                updated_lines.append(f"{var}={env_vars.get(var, '')}\n")
                found_vars[var] = True
                updated = True
                break
        if not updated:
            updated_lines.append(line)

    for var in _SQL_VARS:
        if not found_vars[var]:
            updated_lines.append(f"{var}={env_vars.get(var, '')}\n")

    with open(ENV_FILE, "w", encoding="utf-8") as f:
        f.writelines(updated_lines)


def _print_summary(env_vars: dict[str, str]) -> None:
    """Print summary of updated configuration."""
    print("✅ Configuration updated!")
    print("\n📋 Updated Configuration:")
    print("   SQL_SERVER_HOST=localhost")
    print("   SQL_SERVER_PORT=1433")
    print(f"   SQL_SERVER_DATABASE={env_vars['SQL_SERVER_DATABASE']}")
    print("   SQL_SERVER_USER=  (empty - Windows Auth)")
    print("   SQL_SERVER_PASSWORD=  (empty - Windows Auth)")
    print("\n✅ Setup complete!")
    print("\n💡 Next steps:")
    print("   1. Run: python backend/test_sql_connection.py")
    print("   2. If successful, start the server: python backend/server.py")
    print("   3. Windows Authentication will work automatically (same machine)")


def setup_localhost():
    """Configure .env for localhost connection (best practice)"""
    print("=" * 80)
    print("SETTING UP LOCALHOST CONNECTION (BEST PRACTICE)")
    print("=" * 80)

    env_vars = _read_env_vars()
    _update_env_for_localhost(env_vars)
    _write_env_file(env_vars)
    _print_summary(env_vars)
    return True


if __name__ == "__main__":
    setup_localhost()

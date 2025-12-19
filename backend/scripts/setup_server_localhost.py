#!/usr/bin/env python3
"""
Setup for Running on Server Machine with localhost
Updates .env for localhost connection (best practice)
"""

import io
import sys

if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

from pathlib import Path

ROOT_DIR = Path(__file__).parent
ENV_FILE = ROOT_DIR / ".env"


def setup_localhost():
    """Configure .env for localhost connection (best practice)"""
    print("=" * 80)
    print("SETTING UP LOCALHOST CONNECTION (BEST PRACTICE)")
    print("=" * 80)

    # Read existing .env if it exists
    env_vars = {}
    if ENV_FILE.exists():
        print(f"\n📄 Reading existing {ENV_FILE}...")
        with open(ENV_FILE, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, value = line.split("=", 1)
                    env_vars[key.strip()] = value.strip()

    # Update SQL Server configuration for localhost
    print("\n✅ Updating SQL Server configuration for localhost...")
    env_vars["SQL_SERVER_HOST"] = "localhost"
    env_vars["SQL_SERVER_PORT"] = "1433"
    env_vars["SQL_SERVER_DATABASE"] = env_vars.get(
        "SQL_SERVER_DATABASE", "E_MART_KITCHEN_CARE"
    )

    # Clear SQL Server credentials (Windows Auth)
    if "SQL_SERVER_USER" in env_vars:
        env_vars["SQL_SERVER_USER"] = ""
    if "SQL_SERVER_PASSWORD" in env_vars:
        env_vars["SQL_SERVER_PASSWORD"] = ""

    # Write updated .env
    print(f"\n💾 Writing updated {ENV_FILE}...")

    # Read template or existing file
    lines = []
    if ENV_FILE.exists():
        with open(ENV_FILE, encoding="utf-8") as f:
            lines = f.readlines()

    # Update or add SQL Server variables
    updated_lines = []
    sql_server_vars = [
        "SQL_SERVER_HOST",
        "SQL_SERVER_PORT",
        "SQL_SERVER_DATABASE",
        "SQL_SERVER_USER",
        "SQL_SERVER_PASSWORD",
    ]
    found_vars = dict.fromkeys(sql_server_vars, False)

    # Update existing lines
    for line in lines:
        updated = False
        for var in sql_server_vars:
            if line.strip().startswith(var + "="):
                updated_lines.append(f"{var}={env_vars.get(var, '')}\n")
                found_vars[var] = True
                updated = True
                break
        if not updated:
            updated_lines.append(line)

    # Add missing variables
    for var in sql_server_vars:
        if not found_vars[var]:
            updated_lines.append(f"{var}={env_vars.get(var, '')}\n")

    # Write file
    with open(ENV_FILE, "w", encoding="utf-8") as f:
        f.writelines(updated_lines)

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

    return True


if __name__ == "__main__":
    setup_localhost()

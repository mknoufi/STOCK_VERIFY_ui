#!/usr/bin/env python3
"""
Update Configuration Based on SQL Server Management Studio
Uses the exact connection details from SSMS
"""

import io
import sys

if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

from pathlib import Path

# From SSMS Connection Properties:
# Server Name: SERVER (default instance)
# Authentication: Windows Authentication
# Database: E_MART_KITCHEN_CARE

ENV_FILE = Path(__file__).parent / ".env"


def update_env_file():
    """Update .env with SSMS connection details"""
    print("=" * 80)
    print("UPDATING CONFIGURATION FROM SQL SERVER MANAGEMENT STUDIO")
    print("=" * 80)

    print("\nSSMS Connection Details:")
    print("   Server Name: SERVER (default instance)")
    print("   Authentication: Windows Authentication")
    print("   Database: E_MART_KITCHEN_CARE")
    print("   User: SERVER\\PC (Windows Auth)")

    # Read existing .env
    if ENV_FILE.exists():
        with open(ENV_FILE, encoding="utf-8") as f:
            content = f.read()
    else:
        content = ""

    # Update SQL Server configuration
    updates = {
        "SQL_SERVER_HOST": "SERVER",
        "SQL_SERVER_PORT": "1433",
        "SQL_SERVER_DATABASE": "E_MART_KITCHEN_CARE",
        "SQL_SERVER_USER": "",
        "SQL_SERVER_PASSWORD": "",
    }

    # Update or add each variable
    lines = content.split("\n") if content else []
    updated_lines = []
    found_vars = set()

    for line in lines:
        updated = False
        for var, value in updates.items():
            if line.strip().startswith(var + "="):
                updated_lines.append(f"{var}={value}\n")
                found_vars.add(var)
                updated = True
                break
        if not updated:
            updated_lines.append(line + "\n" if line else "\n")

    # Add missing variables
    for var, value in updates.items():
        if var not in found_vars:
            updated_lines.append(f"{var}={value}\n")

    # Write updated file
    with open(ENV_FILE, "w", encoding="utf-8") as f:
        f.writelines(updated_lines)

    print("\nConfiguration updated!")
    print("\nUpdated Settings:")
    print("   SQL_SERVER_HOST=SERVER")
    print("   SQL_SERVER_PORT=1433")
    print("   SQL_SERVER_DATABASE=E_MART_KITCHEN_CARE")
    print("   SQL_SERVER_USER=  (empty - Windows Auth)")
    print("   SQL_SERVER_PASSWORD=  (empty - Windows Auth)")

    print("\n💡 Next step:")
    print("   python backend/test_sql_connection.py")


if __name__ == "__main__":
    update_env_file()

#!/usr/bin/env python3
"""Fix whitespace issues in files"""

import re
import sys
from pathlib import Path


def fix_whitespace(file_path: Path):
    """Fix whitespace issues in a file"""
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()

        # Fix blank lines with whitespace
        content = re.sub(r"^[ \t]+$", "", content, flags=re.MULTILINE)

        # Ensure file ends with single newline
        content = content.rstrip() + "\n"

        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)

        print(f"Fixed whitespace in {file_path}")

    except Exception as e:
        print(f"Error fixing {file_path}: {e}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python fix_whitespace.py <file_path>")
        sys.exit(1)

    file_path = Path(sys.argv[1])
    if file_path.exists():
        fix_whitespace(file_path)
    else:
        print(f"File not found: {file_path}")

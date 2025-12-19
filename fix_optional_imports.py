import os
import re


def fix_imports(content):
    # If "Optional" is not used as a type hint or name, skip
    if not re.search(r"\bOptional\b", content):
        return content

    # Check if already imported (excluding comments)
    lines = content.split("\n")
    already_imported = False
    for line in lines:
        pure_line = line.split("#")[0]
        if re.search(r"from typing import.*Optional", pure_line) or re.search(
            r"import typing\b", pure_line
        ):
            already_imported = True
            break

    if already_imported:
        return content

    # Pattern for "from typing import ..."
    typing_pattern = re.compile(r"from typing import ([^\#\n]+)")
    match = typing_pattern.search(content)

    if match:
        existing = match.group(1).strip()
        # Clean existing from possible brackets or multiple spaces
        if "Optional" in existing:
            return content

        # Add to existing list
        new_import_line = f"from typing import {existing}, Optional"
        return content.replace(match.group(0), new_import_line)
    else:
        # No typing import found. Add it.
        lines = content.split("\n")
        insert_idx = 0

        # Skip shebang
        if lines and lines[0].startswith("#!"):
            insert_idx = 1

        # Try to skip module docstring
        if len(lines) > insert_idx and (
            lines[insert_idx].startswith('"""') or lines[insert_idx].startswith("'''")
        ):
            found_end = False
            for i in range(insert_idx, len(lines)):
                if i > insert_idx and (
                    lines[i].strip().endswith('"""') or lines[i].strip().endswith("'''")
                ):
                    insert_idx = i + 1
                    found_end = True
                    break
            if not found_end:  # malformed docstring?
                pass

        # Skip initial comments
        while insert_idx < len(lines) and lines[insert_idx].strip().startswith("#"):
            # But stop if it's a ruff/flake8 config we want to stay above or near
            if "ruff:" in lines[insert_idx] or "noqa:" in lines[insert_idx]:
                break
            insert_idx += 1

        lines.insert(insert_idx, "from typing import Optional")
        return "\n".join(lines)


def process_file(filepath):
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()

        new_content = fix_imports(content)

        if content != new_content:
            print(f"Fixing imports in {filepath}")
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(new_content)
    except Exception as e:
        print(f"Error processing {filepath}: {e}")


def main():
    backend_dir = r"/Users/noufi1/cursor new/STOCK_VERIFY_2-db-maped/backend"
    for root, dirs, files in os.walk(backend_dir):
        if any(d in root for d in ["venv", "venv_test", "node_modules", ".git", "__pycache__"]):
            continue
        for file in files:
            if file.endswith(".py"):
                process_file(os.path.join(root, file))


if __name__ == "__main__":
    main()

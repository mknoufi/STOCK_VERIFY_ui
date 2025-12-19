import os
import re


def fix_types(content):
    # Regex for Type | None -> Optional[Type]
    pattern = re.compile(r"([a-zA-Z0-9_.]+(?:\[[^\]]*\])?)\s*\|\s*None")
    content = pattern.sub(r"Optional[\1]", content)

    # Regex for None | Type -> Optional[Type]
    pattern_r = re.compile(r"None\s*\|\s*([a-zA-Z0-9_.]+(?:\[[^\]]*\])?)")
    content = pattern_r.sub(r"Optional[\1]", content)

    return content


def check_and_add_imports(content):
    needs_optional = "Optional[" in content

    lines = content.split("\n")
    has_optional = False
    typing_import_idx = -1

    for i, line in enumerate(lines):
        if line.strip().startswith("from typing import"):
            typing_import_idx = i
            if "Optional" in line:
                has_optional = True

    if needs_optional and not has_optional:
        if typing_import_idx != -1:
            current_imp = lines[typing_import_idx]
            # Simple append logic
            if "Optional" not in current_imp:
                # remove comments
                parts = current_imp.split("#")
                imp_part = parts[0].strip()
                comment = parts[1] if len(parts) > 1 else ""

                new_line = f"{imp_part}, Optional"
                if comment:
                    new_line += f"  #{comment}"
                lines[typing_import_idx] = new_line
        else:
            # Add new import
            insert_idx = 0
            for i, line in enumerate(lines):
                if line.startswith("#") or line.strip() == "":
                    continue
                insert_idx = i
                break
            lines.insert(insert_idx, "from typing import Optional")

    return "\n".join(lines)


def process_file(filepath):
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()

        new_content = fix_types(content)
        new_content = check_and_add_imports(new_content)

        if content != new_content:
            print(f"Fixing types in {filepath}")
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(new_content)
    except Exception as e:
        print(f"Error processing {filepath}: {e}")


def main():
    # Explicitly list problematic files
    targets = [
        "backend/services/scheduled_export_service.py",
        "backend/services/redis_service.py",
        "backend/services/lock_manager.py",
        "backend/api/exports_api.py",
        "backend/api/rack_api.py",
        "backend/server.py",
    ]

    base_dir = r"/Users/noufi1/cursor new/STOCK_VERIFY_2-db-maped"
    for t in targets:
        full_path = os.path.join(base_dir, t)
        if os.path.exists(full_path):
            process_file(full_path)

    # Also walk to catch others
    backend_dir = os.path.join(base_dir, "backend")
    for root, dirs, files in os.walk(backend_dir):
        if any(d in root for d in ["venv", "venv_test", "node_modules", ".git", "__pycache__"]):
            continue
        for file in files:
            if file.endswith(".py") and os.path.join(root, file) not in [
                os.path.join(base_dir, t) for t in targets
            ]:
                process_file(os.path.join(root, file))


if __name__ == "__main__":
    main()

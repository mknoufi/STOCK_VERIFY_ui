import re

filepath = "backend/server.py"

try:
    with open(filepath, "r") as f:
        content = f.read()

    original_len = len(content)

    # 1. Type | None -> Optional[Type]
    # Handle list[str] | None etc.
    # We iterate until no changes to handle multiple occurrences

    # Regex: Capture Type (including optional [...]) then " | None"
    # Note: simple nested brackets like list[dict[str, int]] won't match with [^\]]*
    # But usually one level is enough.

    pattern = re.compile(r"([a-zA-Z0-9_.]+(?:\[[^\]]+\])?)\s*\|\s*None")

    # We replace repeatedly? sub replace all non-overlapping.
    content, count = pattern.subn(r"Optional[\1]", content)
    print(f"Replaced {count} occurrences of 'Type | None'")

    # 2. None | Type -> Optional[Type]
    pattern_r = re.compile(r"None\s*\|\s*([a-zA-Z0-9_.]+(?:\[[^\]]+\])?)")
    content, count_r = pattern_r.subn(r"Optional[\1]", content)
    print(f"Replaced {count_r} occurrences of 'None | Type'")

    # 3. Handle nested Optional if we messed up (Optional[Optional[X]])?
    # Not needed usually.

    if len(content) != original_len or count > 0 or count_r > 0:
        with open(filepath, "w") as f:
            f.write(content)
        print("Updated backend/server.py")
    else:
        print("No changes made to backend/server.py")

except Exception as e:
    print(f"Error: {e}")

import os
import re


def fix_file(filepath):
    with open(filepath) as f:
        content = f.read()

    # 1. Fix corrupted "Any", "Optional[str]", etc.
    # These were caused by greedy sed: s/\([a-zA-Z0-9_]*\) | None/Optional[\1]/g
    # where if it matched "Optional[Any]", it might have become "Any" if the group was "An"??
    # Actually it replaced "Optional[Any]" -> "Optional[Any]"
    # But if it matched "Optional[foo.bar]" -> "Optional[foo.bar]"

    # Let's just fix known corruptions first
    corruptions = {
        r"stOptional\[r\]": "Optional[str]",
        r"dicOptional\[t\]": "Optional[dict]",
        r"floaOptional\[t\]": "Optional[float]",
        r"booOptional\[l\]": "Optional[bool]",
        r"AnOptional\[y\]": "Optional[Any]",
        r"CallablOptional\[e\]": "Optional[Callable]",
        r"LisOptional\[t\]": "Optional[List]",
        r"datetimOptional\[e\]": "Optional[datetime]",
        r"timedeltOptional\[a\]": "Optional[timedelta]",
        r"iOptional\[nt\]": "Optional[int]",
    }

    for pattern, replacement in corruptions.items():
        content = re.sub(pattern, replacement, content)

    # 2. Fix the original "| None" patterns
    # Match something like "Optional[str]" or "Optional[Optional[str]]" (rare)
    # This regex looks for a type name followed by whitespace, pipe, whitespace, and None
    content = re.sub(r"([a-zA-Z0-9_\[\].]+)\s*\|\s*None", r"Optional[\1]", content)

    # 3. Fix "Type1 | Type2" -> "Union[Type1, Type2]"
    # content = re.sub(r'([a-zA-Z0-9_\[\].]+)\s*\|\s*([a-zA-Z0-9_\[\].]+)', r'Union[\1, \2]', content)
    # Safer version: only if non-whitespace chars on both sides and NOT in a string
    # Actually, let's just do it for common ones

    with open(filepath, "w") as f:
        f.write(content)


def main():
    for root, _dirs, files in os.walk("."):
        if "venv" in root or ".git" in root or "__pycache__" in root:
            continue
        for file in files:
            if file.endswith(".py"):
                fix_file(os.path.join(root, file))


if __name__ == "__main__":
    main()

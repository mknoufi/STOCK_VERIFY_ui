import os
import re


def fix_content(content):
    # Order matters here.

    # 1. Handle nested corruption like listOptional[[str]] -> Optional[list[str]]
    pattern_nested = re.compile(r"([a-zA-Z]+)Optional\[\[(.+?)\]\]")
    content = pattern_nested.sub(lambda m: f"Optional[{m.group(1)}[{m.group(2)}]]", content)

    # 2. Handle standard word-stuck corruption like stOptional[r] -> str
    # and also handle cases like Optional[int] if it was iOptional[nt]
    # (Actually iOptional[nt] was handled by my previous run as "i" + "Optional[nt]")
    # Wait, my previous script turned iOptional[nt] into int.
    # Let's check: pattern (\w+)Optional\[(\w+)\]
    # if word is "i" and inside is "nt", result is "int".

    pattern_word = re.compile(r"([a-zA-Z]+)Optional\[([a-zA-Z]+)\]")
    content = pattern_word.sub(lambda m: f"{m.group(1)}{m.group(2)}", content)

    return content


def process_file(filepath):
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()

        new_content = fix_content(content)

        if content != new_content:
            print(f"Fixing {filepath}")
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
            if file.endswith((".py", ".md", ".json", ".txt", ".sql")):
                process_file(os.path.join(root, file))


if __name__ == "__main__":
    main()

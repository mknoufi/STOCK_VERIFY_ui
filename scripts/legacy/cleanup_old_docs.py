import os
import shutil
from datetime import datetime

# Configuration
DOCS_DIR = "docs"
ARCHIVE_DIR = os.path.join(DOCS_DIR, "archive", "old_docs")
FILES_TO_ARCHIVE = [
    "Codebase Memory.md",
    "Cursor Rules.md",
    "Prompt Framework.md",
    # Add other old files here as needed
]


def setup_archive_dir():
    """Ensure the archive directory exists."""
    if not os.path.exists(ARCHIVE_DIR):
        os.makedirs(ARCHIVE_DIR)
        print(f"Created archive directory: {ARCHIVE_DIR}")
    else:
        print(f"Archive directory exists: {ARCHIVE_DIR}")


def archive_files():
    """Move specified files to the archive directory."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    for filename in FILES_TO_ARCHIVE:
        source_path = os.path.join(DOCS_DIR, filename)

        # Also check root if not in docs/
        if not os.path.exists(source_path):
            root_source_path = filename
            if os.path.exists(root_source_path):
                source_path = root_source_path

        if os.path.exists(source_path):
            # Create a versioned name to avoid overwrites
            base, ext = os.path.splitext(filename)
            dest_filename = f"{base}_{timestamp}{ext}"
            dest_path = os.path.join(ARCHIVE_DIR, dest_filename)

            try:
                shutil.move(source_path, dest_path)
                print(f"Archived: {source_path} -> {dest_path}")
            except Exception as e:
                print(f"Error archiving {source_path}: {e}")
        else:
            print(f"File not found (skipping): {filename}")


def main():
    print("Starting documentation cleanup...")
    setup_archive_dir()
    archive_files()
    print("Cleanup complete.")


if __name__ == "__main__":
    main()

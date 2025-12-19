import sys
import os

# Add the current directory to sys.path
sys.path.append(os.getcwd())

try:
    import backend.server  # noqa: F401

    print("Successfully imported backend.server")
except Exception as e:
    print(f"Failed to import backend.server: {e}")
    import traceback

    traceback.print_exc()
    sys.exit(1)

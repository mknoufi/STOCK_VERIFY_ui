import os
import sys
import traceback

sys.path.insert(0, os.getcwd())

print("--- Testing backend.config ---")
try:
    from backend.config import settings

    print(f"Successfully imported backend.config. Settings: {settings is not None}")
except Exception:
    print("Failed to import backend.config:")
    traceback.print_exc()

print("\n--- Testing backend.server ---")
try:
    print("Successfully imported backend.server")
except Exception:
    print("Failed to import backend.server:")
    traceback.print_exc()

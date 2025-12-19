import os
import sys

# Add project root to path
sys.path.insert(0, os.getcwd())

try:
    print("SystemParameters imported successfully")

    print("SQLSyncService imported successfully")

except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)

import pytest
import sys
import os

# Add the project root to sys.path
sys.path.append(os.getcwd())

# Run pytest on the specific file
retcode = pytest.main(["backend/tests/", "-v"])
sys.exit(retcode)

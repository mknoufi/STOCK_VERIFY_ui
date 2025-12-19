import re

filepath = "backend/services/scheduled_export_service.py"

with open(filepath, "r") as f:
    content = f.read()

# 1. Fix Imports
# Replace the bad import line
content = content.replace(
    "from datetime import UTC, datetime, timedelta",
    "from datetime import datetime, timedelta, timezone",
)

# Ensure UTC = timezone.utc is present
if "UTC = timezone.utc" not in content:
    # Try replacing UTC = UTC
    if "UTC = UTC" in content:
        content = content.replace("UTC = UTC", "UTC = timezone.utc")
    else:
        # Insert after imports
        content = re.sub(
            r"(from motor.motor_asyncio import AsyncIOMotorDatabase)",
            r"\1\n\nUTC = timezone.utc",
            content,
        )

# ensure typing import has Optional
if "from typing import Any" in content and "Optional" not in content:
    content = content.replace("from typing import Any", "from typing import Any, Optional")

# 2. Fix Type | None
pattern = re.compile(r"([a-zA-Z0-9_.]+(?:\[[^\]]*\])?)\s*\|\s*None")
content = pattern.sub(r"Optional[\1]", content)

pattern_r = re.compile(r"None\s*\|\s*([a-zA-Z0-9_.]+(?:\[[^\]]*\])?)")
content = pattern_r.sub(r"Optional[\1]", content)

with open(filepath, "w") as f:
    f.write(content)

print("Fixed scheduled_export_service.py")

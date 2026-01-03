from backend.api.schemas import Session
from pydantic import ValidationError

try:
    # Simulate the bad data from MongoDB
    bad_data = {"status": "active"}
    s = Session(**bad_data)
    print("Success:", s)
except ValidationError as e:
    print("Validation Error:", e)
except Exception as e:
    print("Error:", e)

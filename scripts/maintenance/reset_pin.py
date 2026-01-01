from pymongo import MongoClient
from passlib.context import CryptContext
import logging

# Setup password context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def get_password_hash(password):
    return pwd_context.hash(password)


def get_pin_lookup_hash(pin: str) -> str:
    import hashlib

    return hashlib.sha256(pin.encode()).hexdigest()


# Connect to DB
client = MongoClient("mongodb://localhost:27017/")
db = client["stock_verify"]

username = "staff1"
pin = "1234"

# Create hashes
pin_hash = get_password_hash(pin)
pin_lookup_hash = get_pin_lookup_hash(pin)

print(f"Resetting PIN for user: {username}")
print(f"New PIN: {pin}")

result = db.users.update_one(
    {"username": username},
    {
        "$set": {
            "pin_hash": pin_hash,
            "pin_lookup_hash": pin_lookup_hash,
            "is_active": True,
            "role": "staff",
        }
    },
)

if result.modified_count > 0:
    print("✅ PIN updated successfully.")
else:
    print("⚠️  User not found or PIN already set to this value.")
    # Check if user exists at all
    user = db.users.find_one({"username": username})
    if user:
        print("User exists, forcing update...")
        # Force update even if values look same (unlikely with salt)
        db.users.update_one({"username": username}, {"$set": {"updated_at_force": 1}})
    else:
        print("❌ User 'staff1' does not exist! Creating it...")
        db.users.insert_one(
            {
                "username": username,
                "full_name": "Staff Member",
                "role": "staff",
                "is_active": True,
                "pin_hash": pin_hash,
                "pin_lookup_hash": pin_lookup_hash,
                "hashed_password": get_password_hash("staff123"),  # Default password
            }
        )
        print("✅ User 'staff1' created.")

import hashlib


def get_pin_lookup_hash(pin: str) -> str:
    """
    Generate a deterministic SHA-256 hash of the PIN for O(1) lookups.

    WARNING: This is valid for LOOKUP only.
    It MUST NOT be used for verification. Verification must still use
    the slow, salted hash (bcrypt/argon2) stored in `hashed_password` or `pin_hash`.

    Purpose:
    - Allows finding a user by PIN in O(1) time: db.users.find_one({"pin_lookup_hash": ...})
    - Avoids iterating over all users and checking slow hashes (O(N)).
    """
    # Standard SHA-256 hash of the PIN
    return hashlib.sha256(pin.encode("utf-8")).hexdigest()

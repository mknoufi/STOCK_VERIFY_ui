"""
Secure Secret Generator
Generates secure JWT secrets on first run
"""

import secrets
import os
from pathlib import Path


def generate_secrets():
    """Generate secure secrets on first run"""
    # Get project root (backend's parent)
    backend_dir = Path(__file__).parent.parent
    project_root = backend_dir.parent
    secrets_file = project_root / ".secrets"

    if secrets_file.exists():
        print("✅ Secrets file already exists. Skipping generation.")
        return

    # Generate secure secrets
    jwt_secret = secrets.token_urlsafe(32)
    jwt_refresh_secret = secrets.token_urlsafe(32)

    # Write secrets to file
    with open(secrets_file, "w") as f:
        f.write("# Auto-generated secure secrets\n")
        f.write("# DO NOT COMMIT THIS FILE TO GIT\n")
        f.write(f"# Generated: {os.popen('date').read().strip()}\n\n")
        f.write(f"JWT_SECRET={jwt_secret}\n")
        f.write(f"JWT_REFRESH_SECRET={jwt_refresh_secret}\n")

    # Secure file permissions (Unix only)
    if os.name != "nt":
        os.chmod(secrets_file, 0o600)
        print(f"✅ Secure secrets generated in {secrets_file}")
        print("✅ File permissions set to 600 (owner read/write only)")
    else:
        print(f"✅ Secure secrets generated in {secrets_file}")

    print("⚠️  IMPORTANT: Add .secrets to .gitignore if not already present!")
    print("⚠️  IMPORTANT: Never commit this file to version control!")


if __name__ == "__main__":
    generate_secrets()

#!/usr/bin/env python3
"""
Secret Generator Utility

Generates secure secrets for JWT_SECRET and JWT_REFRESH_SECRET.
Can optionally write them to the .env file.
"""

import argparse
import secrets
from pathlib import Path


def generate_secret(length=64):
    """Generate a URL-safe text secret of approximately 'length' characters."""
    # 48 bytes -> ~64 chars in base64/urlsafe
    return secrets.token_urlsafe(48)


def update_env_file(env_path, jwt_secret, jwt_refresh_secret):
    """Update or create .env file with new secrets."""
    env_path = Path(env_path)

    if env_path.exists():
        print(f"Updating existing .env file at {env_path}")
        content = env_path.read_text(encoding="utf-8")
        lines = content.splitlines()

        new_lines = []
        jwt_secret_set = False
        jwt_refresh_set = False

        for line in lines:
            if line.startswith("JWT_SECRET="):
                new_lines.append(f"JWT_SECRET={jwt_secret}")
                jwt_secret_set = True
            elif line.startswith("JWT_REFRESH_SECRET="):
                new_lines.append(f"JWT_REFRESH_SECRET={jwt_refresh_secret}")
                jwt_refresh_set = True
            else:
                new_lines.append(line)

        if not jwt_secret_set:
            new_lines.append(f"JWT_SECRET={jwt_secret}")
        if not jwt_refresh_set:
            new_lines.append(f"JWT_REFRESH_SECRET={jwt_refresh_secret}")

        env_path.write_text("\n".join(new_lines) + "\n", encoding="utf-8")
    else:
        print(f"Creating new .env file at {env_path}")
        content = f"""# Security Secrets
JWT_SECRET={jwt_secret}
JWT_REFRESH_SECRET={jwt_refresh_secret}
"""
        env_path.write_text(content, encoding="utf-8")

    print("✅ .env file updated successfully")


def main():
    parser = argparse.ArgumentParser(
        description="Generate secure secrets for Stock Verify App"
    )
    parser.add_argument(
        "--write", action="store_true", help="Write secrets to .env file"
    )
    parser.add_argument(
        "--env-file", default=".env", help="Path to .env file (default: .env)"
    )

    args = parser.parse_args()

    print("🔐 Generating secure secrets...")
    jwt_secret = generate_secret()
    jwt_refresh_secret = generate_secret()

    print("\nGenerated Secrets:")
    print("-" * 60)
    print(f"JWT_SECRET={jwt_secret}")
    print(f"JWT_REFRESH_SECRET={jwt_refresh_secret}")
    print("-" * 60)

    if args.write:
        # Look for .env in current dir or backend dir
        env_path = Path(args.env_file)
        if not env_path.exists() and (Path("backend") / ".env").exists():
            env_path = Path("backend") / ".env"

        update_env_file(env_path, jwt_secret, jwt_refresh_secret)
    else:
        print("\nTo use these secrets:")
        print("1. Copy the values above")
        print("2. Paste them into your backend/.env file")
        print("   OR run this script with --write to update automatically")


if __name__ == "__main__":
    main()

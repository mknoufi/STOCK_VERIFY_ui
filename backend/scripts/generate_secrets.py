#!/usr/bin/env python3
"""
Generate strong secrets for .env and optionally write to .env file.

Usage:
  python scripts/generate_secrets.py           -> prints secrets
  python scripts/generate_secrets.py --write   -> writes to .env (updates existing keys)

Security:
  - Generates cryptographically secure random secrets
  - Uses 48 bytes of entropy (64 characters base64)
  - Suitable for production use
"""

import argparse
import logging
import secrets
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(levelname)s: %(message)s'
)
logger = logging.getLogger(__name__)

DEFAULT_BYTES = 48


def make_secret(nbytes=DEFAULT_BYTES):
    # token_urlsafe produces ~1.3 * nbytes characters; good entropy
    return secrets.token_urlsafe(nbytes)


def write_env_file(path: Path, secrets_map: dict):
    """Write or update secrets in .env file."""
    if not path.exists():
        # Create new .env from template if available
        example_path = path.parent / ".env.example"
        if example_path.exists():
            logger.info(f"Creating {path} from {example_path}")
            content = example_path.read_text(encoding="utf-8")
            # Replace placeholder values with actual secrets
            for key, value in secrets_map.items():
                content = content.replace(f"{key}=GENERATE_SECURE_SECRET_HERE_MIN_32_CHARS", f"{key}={value}")
                content = content.replace(f"{key}=GENERATE_DIFFERENT_SECURE_SECRET_HERE_MIN_32_CHARS", f"{key}={value}")
            path.write_text(content, encoding="utf-8")
        else:
            # Create simple .env
            with path.open("w", encoding="utf-8") as f:
                for k, v in secrets_map.items():
                    f.write(f"{k}={v}\n")
        logger.info(f"✅ Created {path}")
        return

    # Update existing keys in-place
    lines = path.read_text(encoding="utf-8").splitlines()
    out_lines = []
    used = set()
    for ln in lines:
        if not ln or ln.strip().startswith("#") or "=" not in ln:
            out_lines.append(ln)
            continue
        key, _, rest = ln.partition("=")
        key = key.strip()
        if key in secrets_map:
            out_lines.append(f"{key}={secrets_map[key]}")
            used.add(key)
        else:
            out_lines.append(ln)
    # Append any missing keys
    for k, v in secrets_map.items():
        if k not in used:
            out_lines.append(f"{k}={v}")
    path.write_text("\n".join(out_lines) + "\n", encoding="utf-8")
    logger.info(f"✅ Updated {path}")


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--write", action="store_true", help="Write secrets to backend/.env")
    p.add_argument("--bytes", type=int, default=DEFAULT_BYTES, help="Entropy bytes")
    args = p.parse_args()

    s1 = make_secret(args.bytes)
    s2 = make_secret(args.bytes)

    secrets_map = {
        "JWT_SECRET": s1,
        "JWT_REFRESH_SECRET": s2,
    }

    logger.info("🔐 Generated secrets:")
    logger.info("")
    for k, v in secrets_map.items():
        logger.info(f"{k}={v}")
    logger.info("")
    
    if args.write:
        env_path = Path(__file__).parent.parent / ".env"
        logger.warning("⚠️  This will update your .env file!")
        logger.info(f"Target: {env_path}")
        
        # Safety check
        if env_path.exists():
            response = input("File exists. Continue? [y/N]: ")
            if response.lower() != 'y':
                logger.info("Aborted.")
                return
        
        write_env_file(env_path, secrets_map)
        logger.info("")
        logger.info("✅ Secrets written to .env file")
        logger.info("⚠️  Remember to:")
        logger.info("   1. Never commit .env to Git")
        logger.info("   2. Update production environment variables")
        logger.info("   3. Restart your application")
    else:
        logger.info("💡 To write these to .env file, run with --write flag")
        logger.info("   python scripts/generate_secrets.py --write")

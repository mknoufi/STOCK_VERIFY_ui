#!/usr/bin/env python3
"""
Generate strong secrets for .env and optionally write to .env file.
Usage:
  python scripts/generate_secrets.py           -> prints secrets
  python scripts/generate_secrets.py --write  -> writes to .env (will overwrite existing keys but not other lines)
"""

import secrets
import argparse
from pathlib import Path

DEFAULT_BYTES = 48


def make_secret(nbytes=DEFAULT_BYTES):
    # token_urlsafe produces ~1.3 * nbytes characters; good entropy
    return secrets.token_urlsafe(nbytes)


def write_env_file(path: Path, secrets_map: dict):
    if not path.exists():
        # create simple .env
        with path.open("w", encoding="utf-8") as f:
            for k, v in secrets_map.items():
                f.write(f"{k}={v}\n")
        print(f"Wrote {path}")
        return

    # otherwise update existing keys in-place
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
    # append any missing
    for k, v in secrets_map.items():
        if k not in used:
            out_lines.append(f"{k}={v}")
    path.write_text("\n".join(out_lines) + "\n", encoding="utf-8")
    print(f"Updated {path}")


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

    print("Generated secrets:")
    for k, v in secrets_map.items():
        print(f"{k}={v}")

    if args.write:
        env_path = Path(__file__).parent.parent / ".env"
        write_env_file(env_path, secrets_map)

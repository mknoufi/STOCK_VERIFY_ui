#!/usr/bin/env python3
"""Generate a workspace-wide code inventory + readable report.

This repo is large (backend + frontend + docs). A literal per-line narrative
report is not practical, so this script:

- Inventories relevant files (path, type, size, LOC)
- Produces aggregate stats (by extension and top-level folder)
- Extracts lightweight structural signals from key entrypoints
- Writes:
  - docs/WORKSPACE_CODE_REPORT.md (human readable)
  - docs/WORKSPACE_CODE_INVENTORY.csv (complete inventory)

Usage:
  python scripts/generate_workspace_code_report.py
"""

from __future__ import annotations

import csv
import re
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import DefaultDict, Dict, Iterable


ROOT = Path(__file__).resolve().parents[1]


IGNORE_DIRS = {
    ".git",
    ".venv",
    "venv",
    "node_modules",
    "__pycache__",
    ".pytest_cache",
    ".mypy_cache",
    ".ruff_cache",
    ".expo",
    ".next",
    "dist",
    "build",
    ".gradle",
    ".nx",  # Nx cache/workspace-data can dominate stats but isn't source code
}

# Keep docs; they are a big part of this repo.
INCLUDE_EXTS = {
    ".py",
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".json",
    ".yml",
    ".yaml",
    ".md",
    ".toml",
    ".ini",
    ".sh",
    ".sql",
    ".txt",
    ".env",
    ".example",
}
INCLUDE_NAMES = {"Makefile", "Dockerfile"}


@dataclass(frozen=True)
class FileRow:
    path: str
    kind: str
    bytes: int
    loc: int


def _should_ignore(rel_path: Path) -> bool:
    return any(part in IGNORE_DIRS for part in rel_path.parts)


def _iter_files() -> Iterable[tuple[Path, Path]]:
    """Yield (absolute_path, relative_path) for included files."""
    for abs_path in ROOT.rglob("*"):
        if abs_path.is_dir():
            continue
        rel_path = abs_path.relative_to(ROOT)
        if _should_ignore(rel_path.parent):
            continue
        if (
            abs_path.name in INCLUDE_NAMES
            or abs_path.suffix.lower() in INCLUDE_EXTS
        ):
            yield abs_path, rel_path


def _count_loc(abs_path: Path) -> int:
    try:
        data = abs_path.read_bytes()
    except Exception:
        return -1
    if not data:
        return 0
    return data.count(b"\n") + (0 if data.endswith(b"\n") else 1)


def _kind_for(path: Path) -> str:
    if path.name in INCLUDE_NAMES:
        return path.name
    return path.suffix.lower() or "(noext)"


def _safe_read_text(path: Path, limit_bytes: int = 64_000) -> str:
    try:
        data = path.read_bytes()[:limit_bytes]
        return data.decode("utf-8", errors="replace")
    except Exception:
        return ""


def _extract_fastapi_routes(main_py: Path) -> list[str]:
    """Extract include_router(...) calls from backend/main.py."""
    text = _safe_read_text(main_py, limit_bytes=200_000)
    routes: list[str] = []

    # Example:
    # app.include_router(auth_router, prefix="/api")
    # app.include_router(items_router)  # Enhanced item API
    pattern = re.compile(r"app\.include_router\(([^\)]*)\)")
    for m in pattern.finditer(text):
        inner = m.group(1)
        # single-line normalize
        inner_one = " ".join(inner.split())
        routes.append(inner_one)

    # Keep it readable: dedupe while preserving order
    seen = set()
    out = []
    for r in routes:
        if r not in seen:
            seen.add(r)
            out.append(r)
    return out


def _extract_frontend_exports(api_ts: Path) -> list[str]:
    """Extract exported function names from the main API service layer."""
    text = _safe_read_text(api_ts, limit_bytes=500_000)
    names: list[str] = []

    # export const foo = async (
    for m in re.finditer(r"export\s+const\s+([A-Za-z0-9_]+)\s*=", text):
        names.append(m.group(1))

    # export function foo(
    for m in re.finditer(r"export\s+function\s+([A-Za-z0-9_]+)\s*\(", text):
        names.append(m.group(1))

    # Dedupe preserve order
    seen = set()
    out = []
    for n in names:
        if n not in seen:
            seen.add(n)
            out.append(n)
    return out


def main() -> int:
    rows: list[FileRow] = []

    for abs_path, rel_path in _iter_files():
        try:
            size = abs_path.stat().st_size
        except OSError:
            continue
        rows.append(
            FileRow(
                path=rel_path.as_posix(),
                kind=_kind_for(abs_path),
                bytes=size,
                loc=_count_loc(abs_path),
            )
        )

    # Sort with biggest files first for top-N lists
    rows_by_loc = sorted(
        rows,
        key=lambda row: (row.loc if row.loc >= 0 else 10**12),
        reverse=True,
    )

    # Stats
    by_kind: DefaultDict[str, Dict[str, int]] = defaultdict(
        lambda: {"files": 0, "loc": 0, "bytes": 0}
    )
    by_top: DefaultDict[str, Dict[str, int]] = defaultdict(
        lambda: {"files": 0, "loc": 0, "bytes": 0}
    )

    for r in rows:
        by_kind[r.kind]["files"] += 1
        by_kind[r.kind]["loc"] += max(r.loc, 0)
        by_kind[r.kind]["bytes"] += r.bytes

        top = r.path.split("/", 1)[0] if "/" in r.path else "(root)"
        by_top[top]["files"] += 1
        by_top[top]["loc"] += max(r.loc, 0)
        by_top[top]["bytes"] += r.bytes

    # Key-file extraction
    backend_main = ROOT / "backend" / "main.py"
    backend_server = ROOT / "backend" / "server.py"
    frontend_api = ROOT / "frontend" / "src" / "services" / "api" / "api.ts"

    fastapi_routes = (
        _extract_fastapi_routes(backend_main)
        if backend_main.exists()
        else []
    )
    api_exports = (
        _extract_frontend_exports(frontend_api)
        if frontend_api.exists()
        else []
    )

    # Write inventory CSV
    docs_dir = ROOT / "docs"
    docs_dir.mkdir(exist_ok=True)

    inventory_path = docs_dir / "WORKSPACE_CODE_INVENTORY.csv"
    with inventory_path.open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["path", "kind", "bytes", "loc"])
        for r in sorted(rows, key=lambda x: x.path):
            w.writerow([r.path, r.kind, r.bytes, r.loc])

    # Write readable markdown report
    report_path = docs_dir / "WORKSPACE_CODE_REPORT.md"
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    def md_table(header: list[str], body: list[list[str]]) -> str:
        lines = [
            "| " + " | ".join(header) + " |",
            "|" + "|".join(["---"] * len(header)) + "|",
        ]
        lines += ["| " + " | ".join(row) + " |" for row in body]
        return "\n".join(lines)

    total_files = len(rows)
    total_loc = sum(max(r.loc, 0) for r in rows)

    top_loc_body = [
        [str(row.loc), str(row.bytes), row.kind, row.path]
        for row in rows_by_loc[:30]
        if not row.path.startswith(".nx/")
    ]

    kinds_sorted = sorted(
        by_kind.items(),
        key=lambda kv: kv[1]["loc"],
        reverse=True,
    )
    by_kind_body = [
        [k, str(v["files"]), str(v["loc"]), str(v["bytes"])]
        for k, v in kinds_sorted[:25]
    ]

    top_sorted = sorted(
        by_top.items(),
        key=lambda kv: kv[1]["loc"],
        reverse=True,
    )
    by_top_body = [
        [k, str(v["files"]), str(v["loc"]), str(v["bytes"])]
        for k, v in top_sorted
    ]

    readme_path = ROOT / "README.md"
    codebase_memory = ROOT / "docs" / "codebase_memory_v2.1.md"

    readme_hint = "README.md" if readme_path.exists() else "(missing)"
    memory_hint = (
        "docs/codebase_memory_v2.1.md"
        if codebase_memory.exists()
        else "(missing)"
    )

    report = []
    report.append(f"# Workspace Code Report\n\nGenerated: {now}\n")
    report.append(
        "This report inventories the workspace and summarizes "
        "key entrypoints. "
        "A literal per-line commentary for the entire repository "
        "is not practical; "
        "instead, you get full-file coverage (inventory + stats) and deeper "
        "notes on the main runtime entrypoints.\n"
    )

    report.append("## What This Repo Is\n")
    report.append(f"- Primary overview: `{readme_hint}`\n")
    report.append(f"- Canonical architecture memory: `{memory_hint}`\n")

    report.append("## High-Level Architecture (Observed)\n")
    report.append(
        "- Backend: FastAPI + Motor (MongoDB).\n"
        "- ERP/SQL Server: treated as read-only source of truth "
        "(via connectors/APIs).\n"
        "- Frontend: React Native (Expo) with an offline-first API layer "
        "and caching.\n"
        "- Dynamic LAN configuration: backend writes `backend_port.json`, "
        "frontend reads it (per README).\n"
    )

    report.append("## Workspace Scale\n")
    report.append(f"- Included files: **{total_files}**\n")
    report.append(f"- Included LOC (approx, newline-based): **{total_loc}**\n")
    report.append(
        "- Notes: build artifacts and caches are excluded (e.g., `.nx/`, "
        "`node_modules/`, virtualenvs).\n"
    )

    report.append("## Breakdown by Top-Level Folder\n")
    report.append(md_table(["folder", "files", "loc", "bytes"], by_top_body))
    report.append("\n\n## Breakdown by File Type\n")
    report.append(md_table(["kind", "files", "loc", "bytes"], by_kind_body))

    report.append("\n\n## Largest Files (by LOC)\n")
    report.append(md_table(["loc", "bytes", "kind", "path"], top_loc_body))

    report.append("\n\n## Backend Entrypoints\n")
    if backend_main.exists():
        report.append("- FastAPI app wiring: `backend/main.py`\n")
        if fastapi_routes:
            report.append(
                "\n### Routers registered in `backend/main.py` "
                "(extracted)\n"
            )
            for route in fastapi_routes[:80]:
                report.append(f"- `app.include_router({route})`\n")
            if len(fastapi_routes) > 80:
                report.append(
                    "- (truncated; total include_router calls: "
                    f"{len(fastapi_routes)})\n"
                )
    else:
        report.append("- `backend/main.py` not found\n")

    if backend_server.exists():
        report.append(
            "\n- Server legacy/compat entry: `backend/server.py` "
            "(large; contains wiring, services, legacy routes)\n"
        )

    report.append("\n## Frontend Entrypoints\n")
    if frontend_api.exists():
        report.append(
            "- API service layer: `frontend/src/services/api/api.ts` "
            "(offline-first, cache + retry)\n"
        )
        if api_exports:
            report.append("\n### Exported API functions (extracted)\n")
            for n in api_exports[:120]:
                report.append(f"- `{n}()`\n")
            if len(api_exports) > 120:
                report.append(
                    "- (truncated; total exports detected: "
                    f"{len(api_exports)})\n"
                )
    else:
        report.append("- `frontend/src/services/api/api.ts` not found\n")

    report.append("\n## Full Inventory\n")
    report.append(
        "A complete per-file inventory is written to "
        "`docs/WORKSPACE_CODE_INVENTORY.csv` "
        "(path, kind, bytes, loc).\n"
    )

    report.append("\n## How to Regenerate\n")
    report.append(
        "- Run: `python scripts/generate_workspace_code_report.py`\n"
    )

    report_path.write_text("".join(report), encoding="utf-8")

    print(f"Wrote {report_path}")
    print(f"Wrote {inventory_path}")
    print(f"Included files: {total_files} | Included LOC: {total_loc}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

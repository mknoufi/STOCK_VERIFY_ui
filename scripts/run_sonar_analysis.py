#!/usr/bin/env python3
"""
Local SonarQube Analysis Script

This script prepares reports and runs SonarQube analysis locally.
Requires sonar-scanner to be installed: https://docs.sonarqube.org/latest/analyzing-source-code/scanners/sonarscanner/

Usage:
    python scripts/run_sonar_analysis.py [--server URL] [--token TOKEN]

Environment Variables:
    SONAR_HOST_URL: SonarQube server URL (default: http://localhost:9000)
    SONAR_TOKEN: Authentication token
"""

import argparse
import os
import subprocess
import sys
from pathlib import Path


def run_command(cmd: list[str], cwd: Path | None = None, check: bool = False) -> bool:
    """Run a command and return success status."""
    print(f"Running: {' '.join(cmd)}")
    try:
        result = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True)
        if result.returncode != 0 and check:
            print(f"Command failed: {result.stderr}")
            return False
        return True
    except Exception as e:
        print(f"Error running command: {e}")
        return False


def generate_python_reports(backend_dir: Path) -> None:
    """Generate Python analysis reports."""
    print("\n=== Generating Python Reports ===")

    # Coverage report
    print("Running pytest with coverage...")
    run_command(
        [
            sys.executable,
            "-m",
            "pytest",
            "tests/",
            "-v",
            "--cov=.",
            "--cov-report=xml:coverage.xml",
            "--cov-report=term",
        ],
        cwd=backend_dir,
    )

    # Bandit security report
    print("Running Bandit security analysis...")
    run_command(
        [
            sys.executable,
            "-m",
            "bandit",
            "-r",
            ".",
            "-ll",
            "-f",
            "json",
            "-o",
            "bandit-report.json",
            "--exclude",
            "./tests,./venv,./__pycache__",
        ],
        cwd=backend_dir,
    )

    # Ruff lint report
    print("Running Ruff linting...")
    ruff_result = subprocess.run(
        [sys.executable, "-m", "ruff", "check", ".", "--output-format=json"],
        cwd=backend_dir,
        capture_output=True,
        text=True,
    )
    ruff_report = backend_dir / "ruff-report.json"
    ruff_report.write_text(ruff_result.stdout or "[]")


def generate_frontend_reports(frontend_dir: Path) -> None:
    """Generate frontend analysis reports."""
    print("\n=== Generating Frontend Reports ===")

    # Check if node_modules exists
    if not (frontend_dir / "node_modules").exists():
        print("Installing frontend dependencies...")
        run_command(["npm", "ci", "--legacy-peer-deps"], cwd=frontend_dir)

    # Jest coverage
    print("Running Jest with coverage...")
    run_command(
        ["npm", "run", "test:coverage", "--", "--ci", "--reporters=default"],
        cwd=frontend_dir,
    )

    # ESLint report
    print("Running ESLint...")
    eslint_result = subprocess.run(
        ["npx", "eslint", ".", "--format", "json"],
        cwd=frontend_dir,
        capture_output=True,
        text=True,
        shell=True,  # Required on Windows
    )
    eslint_report = frontend_dir / "eslint-report.json"
    eslint_report.write_text(eslint_result.stdout or "[]")


def run_sonar_scanner(project_dir: Path, server_url: str, token: str | None) -> bool:
    """Run the SonarQube scanner."""
    print("\n=== Running SonarQube Scanner ===")

    cmd = ["sonar-scanner", f"-Dsonar.host.url={server_url}"]

    if token:
        cmd.append(f"-Dsonar.token={token}")

    result = subprocess.run(cmd, cwd=project_dir)
    return result.returncode == 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Run SonarQube analysis locally")
    parser.add_argument(
        "--server",
        default=os.environ.get("SONAR_HOST_URL", "http://localhost:9000"),
        help="SonarQube server URL",
    )
    parser.add_argument(
        "--token",
        default=os.environ.get("SONAR_TOKEN"),
        help="SonarQube authentication token",
    )
    parser.add_argument(
        "--skip-reports",
        action="store_true",
        help="Skip report generation (use existing reports)",
    )
    args = parser.parse_args()

    # Determine project directories
    script_dir = Path(__file__).parent
    project_dir = script_dir.parent
    backend_dir = project_dir / "backend"
    frontend_dir = project_dir / "frontend"

    print(f"Project directory: {project_dir}")
    print(f"SonarQube server: {args.server}")

    if not args.skip_reports:
        # Generate reports
        if backend_dir.exists():
            generate_python_reports(backend_dir)

        if frontend_dir.exists():
            generate_frontend_reports(frontend_dir)

    # Run SonarQube scanner
    success = run_sonar_scanner(project_dir, args.server, args.token)

    if success:
        print("\n✅ SonarQube analysis completed successfully!")
        print(f"View results at: {args.server}/dashboard?id=stock-verify")
        return 0
    else:
        print("\n❌ SonarQube analysis failed!")
        return 1


if __name__ == "__main__":
    sys.exit(main())

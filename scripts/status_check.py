#!/usr/bin/env python3
"""
Quick System Status Checker
Checks the current status of Stock Verification System components
"""

import subprocess
from pathlib import Path


def run_command(cmd):
    """Run a shell command and return output"""
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        return result.stdout.strip(), result.stderr.strip(), result.returncode
    except Exception as e:
        return "", str(e), 1


def check_port(port):
    """Check if a port is in use and return PID if found"""
    stdout, stderr, code = run_command(f"lsof -ti :{port}")
    if code == 0 and stdout:
        return stdout.split("\n")[0]
    return None


def check_process(pid):
    """Check if a process is still running"""
    stdout, stderr, code = run_command(f"kill -0 {pid}")
    return code == 0


def main():
    print("🔍 STOCK VERIFICATION SYSTEM - STATUS CHECK")
    print("=" * 50)
    print()

    # Check service ports
    services = {
        3000: "Enhanced Admin Panel",
        8000: "Backend API Server",
        19006: "Frontend Dev Server",
    }

    print("📊 SERVICE STATUS:")
    running_services = 0

    for port, service in services.items():
        pid = check_port(port)
        if pid:
            print(f"✅ {service}: RUNNING (Port {port}, PID: {pid})")
            running_services += 1
        else:
            print(f"❌ {service}: NOT RUNNING (Port {port})")

    print()

    # Check PID files if logs directory exists
    print("📂 PID FILES:")
    logs_dir = Path("logs")
    if logs_dir.exists():
        pid_files = ["admin.pid", "backend.pid", "frontend.pid"]
        services_names = ["Admin Panel", "Backend API", "Frontend"]

        for pid_file, service_name in zip(pid_files, services_names):
            pid_path = logs_dir / pid_file
            if pid_path.exists():
                try:
                    pid = pid_path.read_text().strip()
                    if check_process(pid):
                        print(f"✅ {service_name}: PID {pid} is running")
                    else:
                        print(f"⚠️  {service_name}: PID {pid} is dead")
                except Exception:
                    print(f"❌ {service_name}: Invalid PID file")
            else:
                print(f"❌ {service_name}: No PID file found")
    else:
        print("❌ Logs directory does not exist")

    print()

    # Check Python environment
    print("🐍 PYTHON ENVIRONMENT:")
    venv_python = Path(".venv/bin/python")
    if venv_python.exists():
        stdout, stderr, code = run_command(f"{venv_python} --version")
        if code == 0:
            print(f"✅ Virtual environment: {stdout}")
        else:
            print("⚠️  Virtual environment exists but Python not working")
    else:
        print("❌ Virtual environment not found")

    print()

    # Check MongoDB
    print("🍃 DATABASE:")
    stdout, stderr, code = run_command("pgrep mongod")
    if code == 0:
        print("✅ MongoDB is running")
    else:
        print("❌ MongoDB not detected")

    print()

    # Check key directories and files
    print("📁 PROJECT STRUCTURE:")
    key_paths = {
        "admin-panel": "Admin Panel Directory",
        "backend": "Backend Directory",
        "frontend": "Frontend Directory",
        "admin-panel/enhanced-server.py": "Enhanced Admin Server",
        "backend/server.py": "Backend Server",
        "frontend/package.json": "Frontend Config",
    }

    for path, description in key_paths.items():
        if Path(path).exists():
            print(f"✅ {description}")
        else:
            print(f"❌ {description}: MISSING")

    print()

    # Summary and recommendations
    print("🎯 SYSTEM SUMMARY:")
    if running_services == 0:
        print("❌ No services are currently running")
        print("💡 To start the system: chmod +x quick_start.sh && ./quick_start.sh")
    elif running_services == len(services):
        print("✅ All services are running successfully!")
        print("🔗 Access URLs:")
        print("   📊 Enhanced Dashboard: http://localhost:3000/dashboard.html")
        print("   🌐 Backend API: http://localhost:8000")
        print("   📱 Frontend: http://localhost:19006")
    else:
        print(f"⚠️  Partial system running ({running_services}/{len(services)} services)")
        print("💡 To restart all: ./stop_all_services.sh && ./quick_start.sh")

    print()


if __name__ == "__main__":
    main()

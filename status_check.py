#!/usr/bin/env python3
"""
Quick System Status Checker
Checks the current status of Stock Verification System components
"""

import json
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


def get_backend_port():
    """Get the backend port from the configuration file or default"""
    try:
        if Path("backend_port.json").exists():
            with open("backend_port.json") as f:
                data = json.load(f)
                return data.get("port", 8000)
    except Exception:
        pass
    return 8000


def check_service_ports(backend_port):
    """Check status of all service ports"""
    print("📊 SERVICE STATUS:")
    services = {
        3000: "Enhanced Admin Panel",
        backend_port: "Backend API Server",
        19006: "Frontend Dev Server",
    }

    running_count = 0
    for port, service in services.items():
        pid = check_port(port)
        if pid:
            print(f"✅ {service}: RUNNING (Port {port}, PID: {pid})")
            running_count += 1
        else:
            print(f"❌ {service}: NOT RUNNING (Port {port})")

    print()
    return running_count, len(services)


def check_pid_files():
    """Check existence and validity of PID files"""
    print("📂 PID FILES:")
    logs_dir = Path("logs")
    if not logs_dir.exists():
        print("❌ Logs directory does not exist")
        print()
        return

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
    print()


def check_python_environment():
    """Verify Python virtual environment"""
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


def check_mongodb():
    """Check if MongoDB process is running"""
    print("🍃 DATABASE:")
    stdout, stderr, code = run_command("pgrep mongod")
    if code == 0:
        print("✅ MongoDB is running")
    else:
        print("❌ MongoDB not detected")
    print()


def check_project_structure():
    """Verify key project files and directories exist"""
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


def print_summary(running_count, total_count, backend_port):
    """Print overall system health summary"""
    print("🎯 SYSTEM SUMMARY:")
    if running_count == 0:
        print("❌ No services are currently running")
        print("💡 To start the system: chmod +x start_app.sh && ./start_app.sh")
    elif running_count == total_count:
        print("✅ All services are running successfully!")
        print("🔗 Access URLs:")
        print("   📊 Enhanced Dashboard: http://localhost:3000/dashboard.html")
        print(f"   🌐 Backend API: http://localhost:{backend_port}")
        print("   📱 Frontend: http://localhost:19006")
    else:
        print(f"⚠️  Partial system running ({running_count}/{total_count} services)")
        print("💡 To restart all: ./stop_all_services.sh && ./start_app.sh")
    print()


def main():
    print("🔍 STOCK VERIFICATION SYSTEM - STATUS CHECK")
    print("=" * 50)
    print()

    backend_port = get_backend_port()
    running_count, total_count = check_service_ports(backend_port)

    check_pid_files()
    check_python_environment()
    check_mongodb()
    check_project_structure()

    print_summary(running_count, total_count, backend_port)


if __name__ == "__main__":
    main()

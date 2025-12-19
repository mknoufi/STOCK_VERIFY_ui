import sys
import importlib.util
import os


def check_module(module_name):
    if importlib.util.find_spec(module_name) is None:
        print(f"❌ {module_name} is NOT installed")
        return False
    print(f"✅ {module_name} is installed")
    return True


def check_file(file_path):
    if os.path.exists(file_path):
        print(f"✅ File exists: {file_path}")
        return True
    print(f"❌ File missing: {file_path}")
    return False


def main():
    print("🔍 Verifying Setup for Stock Verify System...")
    print("-" * 50)

    # 1. Check Python Dependencies
    print("\n1. Checking Python Dependencies:")
    dependencies = ["pandas", "xlsxwriter", "psutil", "fastapi", "uvicorn", "pymongo"]
    all_deps_ok = all(check_module(dep) for dep in dependencies)

    # 2. Check Critical Files
    print("\n2. Checking Critical Files:")
    files = [
        "backend/services/system_report_service.py",
        "backend/api/admin_control_api.py",
        "backend/api/health.py",
        "backend/server.py",
        "frontend/app/admin/settings.tsx",
        "frontend/services/api.ts",
    ]
    all_files_ok = all(check_file(f) for f in files)

    print("-" * 50)
    if all_deps_ok and all_files_ok:
        print("✅ VERIFICATION SUCCESSFUL")
        print("You can now start the servers.")
    else:
        print("❌ VERIFICATION FAILED")
        print("Please fix the missing dependencies or files before starting.")
        sys.exit(1)


if __name__ == "__main__":
    main()

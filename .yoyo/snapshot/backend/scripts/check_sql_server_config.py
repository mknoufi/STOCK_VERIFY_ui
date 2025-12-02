#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Check SQL Server Configuration
Helps identify the exact SQL Server connection parameters
"""

import sys
import io

if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

import subprocess


def run_powershell(cmd):
    """Run PowerShell command"""
    try:
        result = subprocess.run(
            ["powershell", "-Command", cmd], capture_output=True, text=True, timeout=10
        )
        return result.stdout if result.returncode == 0 else None
    except (subprocess.TimeoutExpired, subprocess.SubprocessError, OSError):
        return None


def get_sql_server_services():
    """Get SQL Server services"""
    cmd = (
        'Get-Service | Where-Object {$_.DisplayName -like "*SQL Server*"} | Format-Table -AutoSize'
    )
    return run_powershell(cmd)


def get_sql_browser_service():
    """Get SQL Server Browser service"""
    cmd = 'Get-Service | Where-Object {$_.DisplayName -like "*SQL Server Browser*"} | Format-Table -AutoSize'
    return run_powershell(cmd)


def get_listening_ports():
    """Get listening TCP ports"""
    cmd = 'Get-NetTCPConnection | Where-Object {$_.State -eq "Listen"} | Select-Object LocalAddress, LocalPort | Sort-Object LocalPort | Format-Table -AutoSize'
    return run_powershell(cmd)


def get_sql_instances_from_registry():
    """Get SQL Server instances from registry"""
    cmd = r'Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Microsoft SQL Server\Instance Names\SQL" | Format-List'
    return run_powershell(cmd)


def get_odbc_connections():
    """Get ODBC data sources"""
    cmd = 'Get-OdbcDataSource | Where-Object {$_.Name -like "*E_MART*" -or $_.Name -like "*KITCHEN*" -or $_.Name -like "*Polosys*"} | Format-List'
    return run_powershell(cmd)


def main():
    print("=" * 80)
    print("SQL SERVER CONFIGURATION CHECK")
    print("=" * 80)

    print("\n📋 1. SQL Server Services:")
    services = get_sql_server_services()
    if services:
        print(services)
    else:
        print("   ⚠️  No SQL Server services found or could not query")

    print("\n📋 2. SQL Server Browser:")
    browser = get_sql_browser_service()
    if browser:
        print(browser)
        if "Running" in browser:
            print("   ✅ SQL Server Browser is running (needed for dynamic ports)")
        else:
            print("   ⚠️  SQL Server Browser is NOT running")
            print("   💡 Try: Start-Service 'SQL Server Browser'")
    else:
        print("   ⚠️  SQL Server Browser service not found")

    print("\n📋 3. SQL Server Instances (Registry):")
    instances = get_sql_instances_from_registry()
    if instances:
        print(instances)
    else:
        print("   ⚠️  Could not read from registry")

    print("\n📋 4. Listening TCP Ports:")
    ports = get_listening_ports()
    if ports:
        print(ports)
        # Check for SQL Server ports
        if "1433" in ports or "1434" in ports:
            print("\n   ✅ Found SQL Server ports (1433/1434)")
        else:
            print("\n   ⚠️  SQL Server standard ports (1433/1434) not found")
            print("   💡 SQL Server may be using dynamic ports")
            print("   💡 Enable SQL Server Browser service to use instance names")
    else:
        print("   ⚠️  Could not check ports")

    print("\n📋 5. ODBC Data Sources:")
    odbc = get_odbc_connections()
    if odbc:
        print(odbc)
        print("\n   💡 Check connection string for server name format")
    else:
        print("   ℹ️  No relevant ODBC connections found")

    print("\n" + "=" * 80)
    print("💡 RECOMMENDATIONS:")
    print("=" * 80)
    print("\n1. Open SQL Server Configuration Manager:")
    print("   - Check SQL Server Network Configuration > Protocols")
    print("   - Verify TCP/IP is ENABLED")
    print("   - Check TCP/IP Properties > IP Addresses tab")
    print("   - Look for 'TCP Port' and 'TCP Dynamic Ports' values")

    print("\n2. Start SQL Server Browser service:")
    print("   Start-Service 'SQL Server Browser'")

    print("\n3. Check SQL Server Management Studio:")
    print("   - Try connecting with: localhost, .\\SQLEXPRESS, SERVER")
    print("   - Note which connection format works")
    print("   - Check Server Properties > Connection > Remote connections")

    print("\n4. If Polosys ERP works, check its connection string:")
    print("   - Open Polosys ERP")
    print("   - Check DB CONFIGURE or Settings")
    print("   - Look for exact server name format (SERVER, .\\INSTANCE, etc.)")

    print("\n5. Try connecting with sqlcmd:")
    print("   sqlcmd -S localhost -E  # Windows Auth")
    print("   sqlcmd -S . -E  # Dot notation")
    print("   sqlcmd -S SERVER -E  # Server name")
    print("   sqlcmd -S .\\SQLEXPRESS -E  # Named instance")


if __name__ == "__main__":
    main()

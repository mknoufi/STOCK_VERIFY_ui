import os

import pymssql
import pyodbc
from dotenv import load_dotenv

load_dotenv("backend/.env")

host = os.getenv("SQL_SERVER_HOST", "192.168.1.109")
user = os.getenv("SQL_SERVER_USER", "stockapp")
password = os.getenv("SQL_SERVER_PASSWORD", "StockApp@2025!")
database = os.getenv("SQL_SERVER_DB", "E_MART_KITCHEN_CARE")

print(f"Testing connection to {host} / {database} as {user}")

# Test pyodbc with Driver 17
print("\n--- Testing pyodbc (Driver 17) ---")
try:
    conn_str = f"DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={host};DATABASE={database};UID={user};PWD={password};TrustServerCertificate=yes;Connection Timeout=5"
    conn = pyodbc.connect(conn_str)
    print("SUCCESS: pyodbc connected!")
    cursor = conn.cursor()
    cursor.execute("SELECT @@VERSION")
    print(f"Version: {cursor.fetchone()[0]}")
    conn.close()
except Exception as e:
    print(f"FAILED: pyodbc error: {e}")

# Test pymssql
print("\n--- Testing pymssql ---")
try:
    conn = pymssql.connect(server=host, user=user, password=password, database=database, timeout=5)
    print("SUCCESS: pymssql connected!")
    cursor = conn.cursor()
    cursor.execute("SELECT @@VERSION")
    print(f"Version: {cursor.fetchone()[0]}")
    conn.close()
except Exception as e:
    print(f"FAILED: pymssql error: {e}")

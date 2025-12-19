import os

import pyodbc
from dotenv import load_dotenv

# Load environment variables from backend/.env
load_dotenv("backend/.env")

host = os.getenv("SQL_SERVER_HOST")
port = os.getenv("SQL_SERVER_PORT")
database = os.getenv("SQL_SERVER_DATABASE")
user = os.getenv("SQL_SERVER_USER")
password = os.getenv("SQL_SERVER_PASSWORD")

print(f"Testing connection to SQL Server at {host}:{port}...")
print(f"Database: {database}")
print(f"User: {user}")

conn_str = (
    f"DRIVER={{ODBC Driver 17 for SQL Server}};"
    f"SERVER={host},{port};"
    f"DATABASE={database};"
    f"UID={user};"
    f"PWD={password};"
    "TrustServerCertificate=yes;"
    "Connection Timeout=5;"
)

try:
    conn = pyodbc.connect(conn_str)
    print("✅ Connection successful!")

    cursor = conn.cursor()
    cursor.execute("SELECT @@VERSION")
    row = cursor.fetchone()
    print(f"Server Version: {row[0]}")

    conn.close()
except Exception as e:
    print("❌ Connection failed:")
    print(e)

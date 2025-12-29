# Backend SQL Server Connection Parameters - Technical Reference

## Overview

The backend uses a robust, multi-layered approach to SQL Server connectivity with automatic pooling, retry logic, and health monitoring.

---

## 1. Configuration Parameters

### Source File
- **Location**: [backend/config.py](backend/config.py#L127-L136)
- **Type**: Pydantic Settings class with validation
- **Loading**: Environment variables (case-sensitive)

### Parameters Definition

```python
# SQL Server (Optional - app works without it)
SQL_SERVER_HOST: Optional[str] = Field(
    None, description="SQL Server host (optional)"
)
SQL_SERVER_PORT: int = 1433
SQL_SERVER_DATABASE: Optional[str] = Field(
    None, description="SQL Server database (optional)"
)
SQL_SERVER_USER: Optional[str] = None
SQL_SERVER_PASSWORD: Optional[str] = None
```

### Parameter Details

| Parameter | Type | Default | Required | Notes |
|-----------|------|---------|----------|-------|
| `SQL_SERVER_HOST` | String | None | If using SQL | Hostname or IP address |
| `SQL_SERVER_PORT` | Integer | 1433 | No | Standard SQL Server port |
| `SQL_SERVER_DATABASE` | String | None | If using SQL | Database name |
| `SQL_SERVER_USER` | String | None | No | Username for SQL auth |
| `SQL_SERVER_PASSWORD` | String | None | No | Password for SQL auth |

### Validation Rules

```python
@validator("SQL_SERVER_PORT")
def validate_sql_port(cls, v):
    if v and not (1 <= v <= 65535):
        raise ValueError("SQL_SERVER_PORT must be between 1 and 65535")
    return v
```

**Port Validation**: 1 - 65535 (standard TCP port range)

---

## 2. Connection String Builder

### Source File
- **Location**: [backend/utils/db_connection.py](backend/utils/db_connection.py)
- **Class**: `SQLServerConnectionBuilder`

### ODBC Configuration

**Default Driver**: `ODBC Driver 18 for SQL Server`
**Default Timeout**: 30 seconds

### Connection String Components

```
DRIVER={ODBC Driver 18 for SQL Server};
SERVER={host},{port};
DATABASE={database};
TrustServerCertificate=yes;
Connection Timeout=30;
Login Timeout=30;
Pooling=True;
MARS Connection=True;
ApplicationIntent=ReadWrite;
[UID={user};]
[PWD={password};]
[Trusted_Connection=yes;]
```

### Builder Method

```python
@staticmethod
def build_connection_string(
    host: str,
    database: str,
    port: Optional[int] = None,
    user: Optional[str] = None,
    password: Optional[str] = None,
    timeout: int = DEFAULT_TIMEOUT,
    additional_params: dict[str, Optional[str]] = None,
) -> str:
```

### Connection Optimization Settings

Applied after connection established:
```sql
SET ARITHABORT ON
SET ANSI_NULLS ON
SET ANSI_PADDING ON
SET ANSI_WARNINGS ON
SET QUOTED_IDENTIFIER ON
```

---

## 3. Authentication Modes

### Mode 1: SQL Server Authentication

**When to use**: Standard SQL Server credentials (username/password)

**Configuration**:
```bash
export SQL_SERVER_USER="your_username"
export SQL_SERVER_PASSWORD="your_password"
```

**Connection String**:
```
UID={SQL_SERVER_USER};
PWD={SQL_SERVER_PASSWORD};
```

**Requirements**:
- SQL Server must have mixed authentication enabled
- User must have SELECT permissions on tables
- Password can contain special characters

---

### Mode 2: Windows Authentication

**When to use**: Windows domain users or local system account

**Configuration**:
```bash
# Don't set SQL_SERVER_USER or SQL_SERVER_PASSWORD
# Connection uses Windows login of running process
```

**Connection String**:
```
Trusted_Connection=yes;
```

**Requirements**:
- Must be running on Windows or in AD environment
- Process identity must have database access
- No username/password needed

---

## 4. Connection Initialization

### Source File
- **Location**: [backend/core/lifespan.py](backend/core/lifespan.py#L385-L426)
- **Lifecycle Stage**: Application startup

### Initialization Sequence

```python
# Step 1: Read configuration from environment
sql_host = getattr(settings, "SQL_SERVER_HOST", None)
sql_port = getattr(settings, "SQL_SERVER_PORT", 1433)
sql_database = getattr(settings, "SQL_SERVER_DATABASE", None)
sql_user = getattr(settings, "SQL_SERVER_USER", None)
sql_password = getattr(settings, "SQL_SERVER_PASSWORD", None)

# Step 2: Validate minimum required parameters
if sql_host and sql_database:
    # Attempt connection
else:
    # Skip SQL Server, use MongoDB only
    
# Step 3: Create enhanced connection pool
connection_pool = EnhancedSQLServerConnectionPool(
    host=sql_host,
    port=sql_port,
    database=sql_database,
    user=sql_user,
    password=sql_password,
    retry_attempts=3,
    retry_delay=1.0,
    health_check_interval=60
)
```

### Error Handling

```python
except (ConnectionError, TimeoutError, OSError) as e:
    # Network/system errors
    logger.error(f"SQL Server connection failed (network/system error): {e}")
    
except Exception as e:
    # Other errors (authentication, database not found, etc.)
    logger.warning(f"SQL Server connection failed: {e}")
    # App continues with MongoDB only
```

---

## 5. Enhanced Connection Pool

### Source File
- **Location**: `backend/services/enhanced_connection_pool.py`
- **Class**: `EnhancedSQLServerConnectionPool`

### Pool Parameters

```python
EnhancedSQLServerConnectionPool(
    host=settings.SQL_SERVER_HOST,
    port=settings.SQL_SERVER_PORT,
    database=settings.SQL_SERVER_DATABASE,
    user=getattr(settings, "SQL_SERVER_USER", None),
    password=getattr(settings, "SQL_SERVER_PASSWORD", None),
    retry_attempts=getattr(settings, "CONNECTION_RETRY_ATTEMPTS", 3),
    retry_delay=getattr(settings, "CONNECTION_RETRY_DELAY", 1.0),
    health_check_interval=getattr(
        settings, "CONNECTION_HEALTH_CHECK_INTERVAL", 60
    ),
)
```

### Pool Configuration

| Setting | Default | Purpose |
|---------|---------|---------|
| `retry_attempts` | 3 | Number of retry attempts on failure |
| `retry_delay` | 1.0 sec | Delay between retries |
| `health_check_interval` | 60 sec | Background health check frequency |

### Tunable via Environment

```bash
export CONNECTION_RETRY_ATTEMPTS=5
export CONNECTION_RETRY_DELAY=2.0
export CONNECTION_HEALTH_CHECK_INTERVAL=30
```

---

## 6. Connection Testing

### Source File
- **Location**: [backend/utils/db_connection.py](backend/utils/db_connection.py)
- **Method**: `SQLServerConnectionBuilder.test_connection()`

### Test Method

```python
@staticmethod
def test_connection(
    host: str,
    database: str,
    port: Optional[int] = None,
    user: Optional[str] = None,
    password: Optional[str] = None,
    timeout: int = 5,
) -> bool:
    """
    Test if a connection can be established
    Returns: True if successful, False otherwise
    """
```

### Usage

```python
success = SQLServerConnectionBuilder.test_connection(
    host="192.168.1.100",
    database="ERP",
    port=1433,
    user="readonly_user",
    password="password123"
)
```

---

## 7. Health Check Endpoint

### Endpoint
- **URL**: `GET /health`
- **Location**: [backend/api/health.py](backend/api/health.py)

### Response Format

```json
{
  "status": "healthy",
  "timestamp": "2024-12-23T20:45:30Z",
  "dependencies": {
    "mongodb": {
      "status": "healthy",
      "response_time_ms": 12,
      "last_check": "2024-12-23T20:45:30Z"
    },
    "sql_server": {
      "status": "healthy",
      "response_time_ms": 45,
      "last_check": "2024-12-23T20:45:30Z"
    }
  }
}
```

### SQL Server Status Values

- **`healthy`**: Connection active and responding
- **`unhealthy`**: Connection failed or timed out
- **`not_configured`**: Credentials not provided
- **`initializing`**: Connection pool starting up

---

## 8. Connection String Examples

### Example 1: SQL Server Authentication

```
DRIVER={ODBC Driver 18 for SQL Server};
SERVER=192.168.1.100,1433;
DATABASE=ERP;
UID=readonly_user;
PWD=MyPassword123;
TrustServerCertificate=yes;
Connection Timeout=30;
Login Timeout=30;
Pooling=True;
MARS Connection=True;
ApplicationIntent=ReadWrite
```

### Example 2: Windows Authentication

```
DRIVER={ODBC Driver 18 for SQL Server};
SERVER=erp.company.com,1433;
DATABASE=InventoryDB;
Trusted_Connection=yes;
TrustServerCertificate=yes;
Connection Timeout=30;
Login Timeout=30;
Pooling=True;
MARS Connection=True;
ApplicationIntent=ReadWrite
```

---

## 9. Connector Usage

### Source File
- **Location**: [backend/sql_server_connector.py](backend/sql_server_connector.py)
- **Class**: `SQLServerConnector`

### Initialization

```python
class SQLServerConnector:
    def __init__(self):
        self.connection = None
        self.config = None
        self.mapping = get_active_mapping()
```

### Connection Methods

```python
@retry(stop=stop_after_attempt(3), wait=wait_exponential())
def connect(self, config: dict) -> bool:
    """Establish SQL Server connection with retry logic"""
    
    try:
        # Build connection string
        conn_str = SQLServerConnectionBuilder.build_connection_string(
            host=config['host'],
            database=config['database'],
            port=config.get('port', 1433),
            user=config.get('user'),
            password=config.get('password'),
        )
        
        # Create connection
        self.connection = pyodbc.connect(conn_str)
        self.config = config
        return True
    except Exception as e:
        logger.error(f"Connection failed: {e}")
        return False
```

---

## 10. Timeout & Performance

### Timeout Settings

| Timeout | Default | Configurable | Purpose |
|---------|---------|--------------|---------|
| Connection Timeout | 30 sec | Yes | Time to establish connection |
| Login Timeout | 30 sec | Yes | Time to authenticate |
| Query Timeout | Per query | Per operation | Time to complete query |

### Performance Features

- **Connection Pooling**: `Pooling=True`
- **MARS**: `MARS Connection=True` (Multiple Active Result Sets)
- **Cursor Options**: Optimized for read performance
- **Batch Settings**: `ARITHABORT`, `ANSI_*` flags set

---

## 11. Troubleshooting

### Connection Issues

| Error | Cause | Solution |
|-------|-------|----------|
| "Connection refused" | Wrong host/port or SQL Server not running | Verify host, port, and SQL Server status |
| "Login failed" | Wrong credentials | Verify username and password |
| "Cannot open database" | Database doesn't exist or user lacks permissions | Verify database name and user permissions |
| "Connection timeout" | Network issues or SQL Server slow | Check network, increase timeout |

### Configuration Issues

| Error | Cause | Solution |
|-------|-------|----------|
| "SQL_SERVER_HOST not set" | Missing required parameter | Set SQL_SERVER_HOST environment variable |
| "SQL_SERVER_DATABASE not set" | Missing required parameter | Set SQL_SERVER_DATABASE environment variable |
| "Invalid port" | Port out of range | Verify port is 1-65535 |

---

## 12. Environment Variable Setup

### Quick Setup

```bash
# Set all 5 parameters
export SQL_SERVER_HOST="192.168.1.100"
export SQL_SERVER_PORT="1433"
export SQL_SERVER_DATABASE="ERP"
export SQL_SERVER_USER="readonly_user"
export SQL_SERVER_PASSWORD="MyPassword123"

# Start backend
cd backend && python3 -m backend.server
```

### Using .env File

Create `backend/.env`:
```
SQL_SERVER_HOST=192.168.1.100
SQL_SERVER_PORT=1433
SQL_SERVER_DATABASE=ERP
SQL_SERVER_USER=readonly_user
SQL_SERVER_PASSWORD=MyPassword123
```

### Using Setup Script

```bash
./scripts/setup_sql_and_sync.sh \
  "192.168.1.100" "1433" "ERP" "readonly_user" "Password123"
```

---

## 13. Advanced Configuration

### Retry Configuration

```bash
# Number of connection retry attempts (default: 3)
export CONNECTION_RETRY_ATTEMPTS=5

# Delay between retries in seconds (default: 1.0)
export CONNECTION_RETRY_DELAY=2.0
```

### Health Check Configuration

```bash
# Health check interval in seconds (default: 60)
export CONNECTION_HEALTH_CHECK_INTERVAL=30
```

### Connection Pool Configuration

```bash
# Enable/disable connection pool (default: true)
export USE_CONNECTION_POOL=true

# Pool size (driver-level setting)
# Controlled by pyodbc/ODBC driver
```

---

## 14. Verification Steps

### 1. Check Configuration

```bash
# View current settings
env | grep SQL_SERVER
```

### 2. Test Connection

```bash
curl http://localhost:8001/health | jq .dependencies.sql_server
```

### 3. Verify in Logs

```bash
tail -f backend/logs/app.log | grep -i "sql server"
```

### 4. Query Data

```bash
# After sync
curl -X GET "http://localhost:8001/api/items/search?q=51" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 15. Security Considerations

### Best Practices

1. **Never commit credentials** to git
2. **Use environment variables** instead of hardcoding
3. **Store passwords securely** (secrets manager)
4. **Use read-only user** for database access
5. **Enable TrustServerCertificate** only for testing (production: validate certs)
6. **Use Windows Auth** when available (better security)
7. **Rotate credentials** regularly

### SQL Server Permission Setup

```sql
-- Create read-only user (SQL Server)
CREATE LOGIN readonly_user WITH PASSWORD = 'SecurePassword123'
USE YourDatabase
CREATE USER readonly_user FOR LOGIN readonly_user
ALTER ROLE db_datareader ADD MEMBER readonly_user
```

---

## References

- **Config**: [backend/config.py](backend/config.py)
- **Builder**: [backend/utils/db_connection.py](backend/utils/db_connection.py)
- **Connector**: [backend/sql_server_connector.py](backend/sql_server_connector.py)
- **Lifecycle**: [backend/core/lifespan.py](backend/core/lifespan.py)
- **Setup Guide**: [SQL_SERVER_SETUP_GUIDE.md](SQL_SERVER_SETUP_GUIDE.md)

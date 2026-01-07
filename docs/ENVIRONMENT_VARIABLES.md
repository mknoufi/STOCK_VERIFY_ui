# Environment Variables Reference

This document lists the environment variables used to configure the Stock Verification System.

## Database

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `MONGO_URL` | Connection string for MongoDB | `mongodb://127.0.0.1:27017` | Yes |
| `DB_NAME` | Name of the MongoDB database | `stock_verification` | Yes |

## Security (JWT)

> **CRITICAL:** `JWT_SECRET` and `JWT_REFRESH_SECRET` must be kept secret and never committed to version control.

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `JWT_SECRET` | Secret key for signing access tokens | - | **Yes** |
| `JWT_REFRESH_SECRET` | Secret key for signing refresh tokens | - | **Yes** |
| `JWT_ALGORITHM` | Algorithm used for JWT signing | `HS256` | No |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Access token lifetime in minutes | `15` | No |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Refresh token lifetime in days | `30` | No |

## ERP Integration (SQL Server)

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `SQL_SERVER_HOST` | Hostname of the SQL Server | - | No |
| `SQL_SERVER_PORT` | Port of the SQL Server | `1433` | No |
| `SQL_SERVER_DATABASE` | Database name | - | No |
| `SQL_SERVER_USER` | Username for authentication | - | No |
| `SQL_SERVER_PASSWORD` | Password for authentication | - | No |

## Cache (Redis)

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `REDIS_URL` | Connection string for Redis | `redis://localhost:6379/0` | No |
| `REDIS_PASSWORD` | Password for Redis | - | No |

## Application

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `LOG_LEVEL` | Logging verbosity (DEBUG, INFO, WARN, ERROR) | `INFO` | No |

## Setup Instructions

1. Copy `backend/.env.example` to `backend/.env`.
2. Generate secure secrets for `JWT_SECRET` and `JWT_REFRESH_SECRET`.
3. Configure your database connections.

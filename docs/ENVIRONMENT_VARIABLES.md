# Environment Variables

This project uses environment variables for configuration. Do **not** commit real secrets (use `*.env.example` templates).

## Backend (`backend/.env.example`)

**Core**
- `ENVIRONMENT`: `development` | `staging` | `production`
- `APP_NAME`, `APP_VERSION`
- `LOG_LEVEL`: `DEBUG` | `INFO` | `WARNING` | `ERROR`

**MongoDB**
- `MONGO_URL` (preferred)
- `MONGODB_URI` / `MONGODB_URL` (accepted aliases)
- `DB_NAME`

**JWT (required)**
- `JWT_SECRET` (min 32 chars)
- `JWT_REFRESH_SECRET` (min 32 chars)
- `JWT_ALGORITHM` (default `HS256`)
- `ACCESS_TOKEN_EXPIRE_MINUTES`, `REFRESH_TOKEN_EXPIRE_DAYS`

**SQL Server (optional)**
- `SQL_SERVER_HOST`, `SQL_SERVER_PORT`, `SQL_SERVER_DATABASE`
- `SQL_SERVER_USER`, `SQL_SERVER_PASSWORD`

**Redis (optional, recommended in production)**
- `REDIS_URL`

**CORS**
- `CORS_ALLOW_ORIGINS` (recommended for non-dev; comma-separated)
- `CORS_DEV_ORIGINS` (comma-separated)

Notes:
- The ERP mapping “connection password” is stored encrypted at rest in MongoDB (derived from `JWT_SECRET`) and is not returned by the API.

## Frontend (`frontend/.env.example`)

Expo public variables (available to the app at build/runtime):
- `EXPO_PUBLIC_BACKEND_PORT`
- `EXPO_PUBLIC_BACKEND_URL` (optional override; recommended for production)
- `EXPO_PUBLIC_API_TIMEOUT`
- `EXPO_PUBLIC_DEBUG_MODE`
- `EXPO_PUBLIC_ENABLE_NETWORK_LOGGING`

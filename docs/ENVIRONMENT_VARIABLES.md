# Environment Variables

## Backend Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `APP_NAME` | Name of the application | "Stock Count Application" | No |
| `APP_VERSION` | Current application version | "1.0.0" | No |
| `DEBUG` | Enable debug mode (true/false) | False | No |
| `ENVIRONMENT` | Deployment environment (development, staging, production) | development | No |
| `MONGO_URL` | MongoDB connection string | mongodb://localhost:27017 | No |
| `DB_NAME` | Database name | stock_verification | No |
| `SQL_SERVER_CONNECTION_STRING` | Connection string for Legacy ERP SQL Server | - | Yes (for sync) |
| `JWT_SECRET` | Secret key for JWT signing | - | Yes |
| `JWT_REFRESH_SECRET` | Secret key for Refresh Token signing | - | Yes |
| `CORS_ALLOW_ORIGINS` | Comma-separated list of allowed origins | - | No |

## Frontend Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `EXPO_PUBLIC_BACKEND_URL` | URL of the backend API | <http://localhost:8001> | Yes |

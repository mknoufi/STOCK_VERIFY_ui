# Manual Deployment Guide (No Docker)

Since Docker is currently experiencing issues, you can deploy the application directly on your Mac using the provided script.

## Prerequisites

- **MongoDB** must be installed (`brew install mongodb-community` if not present).
- **Python 3.11** must be active.
- **Node.js** must be active.

## Quick Start

Run the deployment script:

```bash
./scripts/deploy_manual.sh
```

## What this script does

1. **Starts MongoDB** using a local data folder (`mongodb_data`) in your project directory.
2. **Sets up Python Backend**:
    - Creates a virtual environment.
    - Installs dependencies.
    - Starts the server on port 8001 using Gunicorn (production server).
3. **Starts Frontend**:
    - Installs Node modules.
    - Launches Expo to generate a QR code for your mobile device.

## Accessing the App

- **Backend API**: `http://192.168.31.212:8001/docs` (or `/health`)
- **Mobile App**: Scan the QR code shown in the terminal.

## Stopping the App

To stop the background services (MongoDB and Backend), run:

```bash
# Find and kill the processes
pkill -f "mongod --dbpath"
pkill -f "gunicorn backend.server:app"
```

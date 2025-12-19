# Admin Control Panel

A secure web-based admin panel for managing STOCK_VERIFY services with enhanced security features.

## 🆕 Recent Security Updates

- ✅ **Fixed CORS vulnerabilities** - Restricted cross-origin requests
- 🔒 **Added input validation** - Prevents injection attacks
- 🛡️ **Enhanced authentication** - Required for sensitive operations
- 📊 **Added rate limiting** - Prevents command flooding
- 🔐 **Security headers** - XSS protection and content security

See `SECURITY_FIXES.md` for detailed security improvements.

## Features

- ✅ **Service Status Monitoring**: Real-time status of MongoDB, Backend, and Frontend
- 📊 **Live Logs**: View logs from all services in real-time with security validation
- 📱 **QR Code Display**: Show Expo QR code for mobile app connection
- 🎛️ **Service Control**: Secure start, stop, and restart services
- 🔄 **Auto-refresh**: Automatic status updates every 5 seconds with timeout protection
- 📥 **Log Export**: Export logs for debugging with access controls
- 🔒 **Security Monitoring**: Enhanced error handling and security event logging

## Quick Start

### Option 1: Using Python Server (Recommended)

```bash
cd admin-panel
python3 server.py
```

Then open: http://localhost:3000

### Option 2: Using Backend API

The admin panel can also work directly with the backend API at `http://localhost:8000/api/v1/admin/control`

Just open `index.html` in your browser (file:// protocol works, but API calls may be blocked by CORS).

## Usage

1. **View Service Status**: Cards show real-time status of all services
2. **View Logs**: Select a service from dropdown to view its logs
3. **Control Services**: Use toggle buttons to start/stop individual services
4. **Quick Actions**: Use action buttons for bulk operations
5. **QR Code**: Click QR Code button on Frontend card to see Expo QR code

## API Endpoints

The admin panel server provides these endpoints:

- `GET /api/status` - Get status of all services
- `GET /api/logs?service=<name>` - Get logs for a service
- `GET /api/qr` - Get QR code data
- `POST /api/start` - Start all services
- `POST /api/stop` - Stop all services
- `POST /api/restart` - Restart all services

## Screenshots

The panel features:
- Dark theme optimized for development
- Responsive design (works on mobile too)
- Real-time updates
- Beautiful UI with icons and status indicators

## Troubleshooting

**CORS Issues**: If opening `index.html` directly, you may need to run the Python server instead.

**Services Not Detected**: Make sure services are running and accessible on their default ports.

**Logs Not Showing**: Check that log files exist in the project root (`backend.log`, `frontend.log`).

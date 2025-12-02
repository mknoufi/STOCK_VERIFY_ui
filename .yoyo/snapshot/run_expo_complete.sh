#!/bin/bash

echo "🚀 LAUNCHING COMPLETE SYSTEM WITH EXPO QR"
echo "=========================================="

# Make scripts executable
chmod +x /Users/noufi1/STOCK_VERIFY_2-db-maped/start_expo_qr.sh
chmod +x /Users/noufi1/STOCK_VERIFY_2-db-maped/start_frontend_qr.sh

# Navigate to project directory
cd /Users/noufi1/STOCK_VERIFY_2-db-maped

# Execute the complete startup
echo "🎯 Starting all services..."
exec ./start_expo_qr.sh
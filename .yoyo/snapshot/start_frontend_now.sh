echo "📱 Starting Frontend Development Server..."
echo "Web URL: http://localhost:19006"
echo "Expo DevTools will open automatically"
echo ""

cd /Users/noufi1/STOCK_VERIFY_2-db-maped/frontend

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

exec npx expo start --web

echo "🔧 Starting Backend API Server..."
echo "API URL: http://localhost:8000"
echo "Docs URL: http://localhost:8000/docs"
echo ""

cd /Users/noufi1/STOCK_VERIFY_2-db-maped/backend
export PYTHONPATH="/Users/noufi1/STOCK_VERIFY_2-db-maped:${PYTHONPATH:-}"
exec /Users/noufi1/STOCK_VERIFY_2-db-maped/.venv/bin/python server.py
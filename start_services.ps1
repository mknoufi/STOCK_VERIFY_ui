# Install dependencies
Write-Host "📦 Installing dependencies..."
pip install -r requirements.production.txt

# Start MongoDB
if ($IsWindows) {
    net start MongoDB
} else {
    Write-Host "⚠️  Skipping 'net start MongoDB' (Not on Windows). Please ensure MongoDB is running manually (e.g., 'brew services start mongodb-community')."
}

# Start Backend
Write-Host "🚀 Starting Backend..."
if ($IsWindows) {
    Start-Process uvicorn "backend.server:app" -ArgumentList "--host 0.0.0.0 --port 8000 --workers 4"
} else {
    # On macOS/Linux, run directly in the shell or use & for background
    # Start-Process on macOS can be tricky with PATH.
    # Let's try running it directly.
    Write-Host "Starting uvicorn..."
    uvicorn backend.server:app --host 0.0.0.0 --port 8000 --workers 4
}

# Start Frontend (if exists)
if (Test-Path "frontend\build") {
    Write-Host "🚀 Starting Frontend..."
    Push-Location frontend\build
    Start-Process http-server "-p 3000"
    Pop-Location
}

Write-Host "✓ Production services started"

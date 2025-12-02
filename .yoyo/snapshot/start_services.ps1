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
$env:PYTHONPATH = "$PSScriptRoot;$env:PYTHONPATH"
if ($IsWindows -or $env:OS) {
    Start-Process -FilePath "python" -ArgumentList "-m", "uvicorn", "backend.server:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4" -WorkingDirectory $PSScriptRoot
} else {
    # On macOS/Linux, run directly in the shell or use & for background
    Write-Host "Starting uvicorn..."
    Set-Location $PSScriptRoot
    python -m uvicorn backend.server:app --host 0.0.0.0 --port 8000 --workers 4
}

# Start Frontend (if exists)
$FrontendBuildPath = Join-Path $PSScriptRoot "frontend" "build"
if (Test-Path $FrontendBuildPath) {
    Write-Host "🚀 Starting Frontend..."
    Push-Location $FrontendBuildPath
    if (Get-Command http-server -ErrorAction SilentlyContinue) {
        Start-Process -FilePath "http-server" -ArgumentList "-p", "3000" -WorkingDirectory $FrontendBuildPath
    } else {
        Write-Host "⚠️  http-server not found. Install with: npm install -g http-server" -ForegroundColor Yellow
    }
    Pop-Location
}

Write-Host "✓ Production services started"

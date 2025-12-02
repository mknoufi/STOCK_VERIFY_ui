$ErrorActionPreference = "Stop"

Write-Host "=== Stock Verify Setup (Windows) ===" -ForegroundColor Cyan

function Assert-Command {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name
    )

    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Required command '$Name' was not found on PATH. Please install it and re-run the script."
    }
}

function Run-Step {
    param(
        [string]$Message,
        [scriptblock]$Action
    )

    Write-Host "`n>> $Message" -ForegroundColor Yellow
    & $Action
    Write-Host "✔ Completed: $Message" -ForegroundColor Green
}

Assert-Command python
Assert-Command npm
Assert-Command node

Run-Step "Creating Python virtual environment" {
    if (-not (Test-Path ".venv")) {
        python -m venv .venv
    }
}

Run-Step "Installing backend dependencies" {
    & .\.venv\Scripts\pip.exe install --upgrade pip
    & .\.venv\Scripts\pip.exe install -r backend\requirements.txt
}

Run-Step "Installing frontend dependencies" {
    Push-Location frontend
    npm install
    Pop-Location
}

Write-Host "`nSetup complete!" -ForegroundColor Cyan
Write-Host "Next steps:"
Write-Host "1. Copy or create backend\.env with your secrets."
Write-Host "2. Start MongoDB (service or 'mongod')."
Write-Host "3. Backend: '.\.venv\Scripts\Activate.ps1' then 'python -m uvicorn backend.server:app --host 0.0.0.0 --port 8001 --reload'."
Write-Host "4. Frontend: 'cd frontend' then 'npm run web'."

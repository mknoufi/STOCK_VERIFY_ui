# Format code using Black, isort, and Prettier

Write-Host "🔧 Formatting code..." -ForegroundColor Cyan

# Format Python code
Write-Host "📝 Formatting Python code..." -ForegroundColor Yellow
if (Get-Command black -ErrorAction SilentlyContinue) {
    black backend/ --line-length 100
    Write-Host "✅ Black formatting complete" -ForegroundColor Green
} else {
    Write-Host "⚠️  Black not installed. Install with: pip install black" -ForegroundColor Yellow
}

if (Get-Command isort -ErrorAction SilentlyContinue) {
    isort backend/ --profile black
    Write-Host "✅ isort formatting complete" -ForegroundColor Green
} else {
    Write-Host "⚠️  isort not installed. Install with: pip install isort" -ForegroundColor Yellow
}

# Format TypeScript/JavaScript code
Write-Host "📝 Formatting TypeScript/JavaScript code..." -ForegroundColor Yellow
if (Get-Command npx -ErrorAction SilentlyContinue) {
    Set-Location frontend
    npx prettier --write "**/*.{ts,tsx,js,jsx,json}" --ignore-path .gitignore
    Write-Host "✅ Prettier formatting complete" -ForegroundColor Green
    Set-Location ..
} else {
    Write-Host "⚠️  npx not available. Install Node.js and npm" -ForegroundColor Yellow
}

Write-Host "✅ Code formatting complete!" -ForegroundColor Green

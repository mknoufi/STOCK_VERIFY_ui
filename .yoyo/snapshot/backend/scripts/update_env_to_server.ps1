# Update .env file to use SERVER (from SSMS)
$envFile = "backend\.env"

Write-Host "Updating .env file to use SERVER (from SSMS)..." -ForegroundColor Cyan

if (Test-Path $envFile) {
    $content = Get-Content $envFile -Raw

    # Update SQL_SERVER_HOST to SERVER
    $content = $content -replace "SQL_SERVER_HOST=.*", "SQL_SERVER_HOST=SERVER"
    $content = $content -replace "SQL_SERVER_PORT=.*", "SQL_SERVER_PORT=1433"
    $content = $content -replace "SQL_SERVER_DATABASE=.*", "SQL_SERVER_DATABASE=E_MART_KITCHEN_CARE"
    $content = $content -replace "SQL_SERVER_USER=.*", "SQL_SERVER_USER="
    $content = $content -replace "SQL_SERVER_PASSWORD=.*", "SQL_SERVER_PASSWORD="

    Set-Content $envFile $content -Encoding UTF8

    Write-Host "Updated configuration:" -ForegroundColor Green
    Write-Host "  SQL_SERVER_HOST=SERVER" -ForegroundColor White
    Write-Host "  SQL_SERVER_PORT=1433" -ForegroundColor White
    Write-Host "  SQL_SERVER_DATABASE=E_MART_KITCHEN_CARE" -ForegroundColor White
    Write-Host "  SQL_SERVER_USER= (empty - Windows Auth)" -ForegroundColor White
    Write-Host "  SQL_SERVER_PASSWORD= (empty - Windows Auth)" -ForegroundColor White
} else {
    Write-Host "Creating .env file..." -ForegroundColor Yellow
    $envContent = @"
SQL_SERVER_HOST=SERVER
SQL_SERVER_PORT=1433
SQL_SERVER_DATABASE=E_MART_KITCHEN_CARE
SQL_SERVER_USER=
SQL_SERVER_PASSWORD=
"@
    Set-Content $envFile $envContent -Encoding UTF8
    Write-Host ".env file created!" -ForegroundColor Green
}

Write-Host "`nNext: Run python backend\test_sql_connection.py" -ForegroundColor Cyan

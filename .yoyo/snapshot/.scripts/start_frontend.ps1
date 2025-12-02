Set-Location 'D:\testapp\Stock_count'
$proc = Start-Process -FilePath 'npm' -ArgumentList '--prefix','frontend','run','web' -WorkingDirectory (Get-Location) -PassThru
Write-Output ("Started frontend PID: {0}" -f $proc.Id)

Set-Location 'D:\testapp\Stock_count'
$proc = Start-Process -FilePath 'cmd.exe' -ArgumentList '/c','npm --prefix frontend run web' -WorkingDirectory (Get-Location) -PassThru
Write-Output ("Started frontend PID: {0}" -f $proc.Id)

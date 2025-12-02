$ports = @(8000,8081,19000,19001,19002,19003,19004,19005,19006,3000,3306)
foreach ($p in $ports) {
    Write-Output ("Checking port {0}..." -f $p)
    $mtchs = netstat -ano | Select-String -Pattern (":{0}\s" -f $p)
    if ($mtchs) {
        foreach ($m in $mtchs) {
            $line = $m.ToString().Trim()
            $cols = -split $line
            $pidVal = $cols[-1]
            Write-Output ("Found PID {0} listening on port {1}, attempting to stop..." -f $pidVal, $p)
            try {
                Stop-Process -Id ([int]$pidVal) -Force -ErrorAction Stop
                Write-Output ("Stopped PID {0}" -f $pidVal)
            } catch {
                Write-Output ("Failed to stop PID {0}: {1}" -f $pidVal, $_)
            }
        }
    } else {
        Write-Output ("No process found on port {0}" -f $p)
    }
}

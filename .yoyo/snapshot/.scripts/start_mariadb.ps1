$names = @('MariaDB','MySQL','mysqld')
foreach ($n in $names) {
    try {
        $s = Get-Service -Name $n -ErrorAction Stop
        Write-Output ("Found service: {0} (Status: {1})" -f $n, $s.Status)
        if ($s.Status -ne 'Running') {
            Start-Service -Name $n
            Start-Sleep -Seconds 1
            $s = Get-Service -Name $n
            Write-Output ("Started service {0} (Status: {1})" -f $n, $s.Status)
            break
        } else {
            Write-Output ("Service {0} already running" -f $n)
            break
        }
    } catch {
        Write-Output ("Service {0} not found" -f $n)
    }
}

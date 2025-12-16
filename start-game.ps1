Write-Host "Starting CivBuilder..."
Write-Host "Starting Backend Server on Port 3000..."
Start-Process -FilePath "npm" -ArgumentList "run server" -NoNewWindow
Write-Host "Starting Frontend Dev Server..."
Start-Process -FilePath "npm" -ArgumentList "run dev" -NoNewWindow

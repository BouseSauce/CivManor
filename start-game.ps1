Write-Host "Starting CivBuilder..."
Write-Host "Checking Backend Server..."
node scripts/ensure_server.cjs
Write-Host "Starting Frontend Dev Server..."
Start-Process -FilePath "npm" -ArgumentList "run dev" -NoNewWindow

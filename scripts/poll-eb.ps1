param(
    [string]$App = 'Sovereign',
    [string]$Env = 'Sovereign-env',
    [string]$Region = 'ap-southeast-2',
    [int]$MaxMinutes = 20
)

$maxLoops = [int]($MaxMinutes * 6) # 10s intervals
for ($i = 0; $i -lt $maxLoops; $i++) {
    $raw = (aws elasticbeanstalk describe-environments --application-name $App --environment-names $Env --region $Region --output json) 2>$null
    if ($LASTEXITCODE -ne 0 -or -not $raw) {
        Write-Host "No environment info yet or AWS CLI error (attempt $($i+1)/$maxLoops)"
        Start-Sleep -Seconds 5
        continue
    }
    $json = $raw | Out-String | ConvertFrom-Json
    if (-not $json.Environments -or $json.Environments.Count -eq 0) {
        Write-Host "No environment entries yet (attempt $($i+1)/$maxLoops)"
        Start-Sleep -Seconds 5
        continue
    }
    $env = $json.Environments[0]
    Write-Host ("[{0}] Status={1} Health={2} CNAME={3} EndpointURL={4}" -f (Get-Date -Format 's'), $env.Status, $env.Health, $env.CNAME, $env.EndpointURL)
    if ($env.Status -ne 'Launching' -and $env.Status -ne 'Updating') {
        break
    }
    Start-Sleep -Seconds 10
}

Write-Host "Final environment JSON (raw):"
Write-Host $raw

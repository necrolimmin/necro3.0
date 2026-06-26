$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Python = Join-Path $Root ".venv\Scripts\python.exe"
$Backend = Join-Path $Root "backend"
$Frontend = Join-Path $Root "frontend"
$WorkerPidFile = Join-Path $Backend ".dev-worker.pid"

if (!(Test-Path $Python)) {
  throw "Python environment was not found. Run scripts\setup-local.ps1 first."
}

function Test-Port($Port) {
  return [bool](Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
}

if (!(Test-Port 8000)) {
  Start-Process -FilePath $Python `
    -ArgumentList "manage.py", "runserver", "127.0.0.1:8000" `
    -WorkingDirectory $Backend `
    -RedirectStandardOutput (Join-Path $Backend ".dev-backend.log") `
    -RedirectStandardError (Join-Path $Backend ".dev-backend-error.log") `
    -WindowStyle Hidden
  Write-Host "Backend started on http://127.0.0.1:8000"
} else {
  Write-Host "Backend is already running on port 8000"
}

$workerRunning = $false
if (Test-Path $WorkerPidFile) {
  $workerPid = Get-Content $WorkerPidFile -ErrorAction SilentlyContinue
  $workerRunning = [bool](Get-Process -Id $workerPid -ErrorAction SilentlyContinue)
}

if (!$workerRunning) {
  $env:PYTHONUNBUFFERED = "1"
  $worker = Start-Process -FilePath $Python `
    -ArgumentList "manage.py", "run_transcode_worker", "--poll-interval", "3" `
    -WorkingDirectory $Backend `
    -RedirectStandardOutput (Join-Path $Backend ".dev-worker.log") `
    -RedirectStandardError (Join-Path $Backend ".dev-worker-error.log") `
    -WindowStyle Hidden `
    -PassThru
  Set-Content -Path $WorkerPidFile -Value $worker.Id
  Write-Host "Episode and media worker started"
} else {
  Write-Host "Episode and media worker is already running"
}

if (!(Test-Port 3000)) {
  Start-Process -FilePath "npm.cmd" `
    -ArgumentList "run", "dev" `
    -WorkingDirectory $Frontend `
    -RedirectStandardOutput (Join-Path $Frontend ".dev-server.log") `
    -RedirectStandardError (Join-Path $Frontend ".dev-server-error.log") `
    -WindowStyle Hidden
  Write-Host "Frontend started on http://localhost:3000"
} else {
  Write-Host "Frontend is already running on port 3000"
}

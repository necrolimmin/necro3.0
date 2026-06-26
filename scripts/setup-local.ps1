$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

if (!(Test-Path ".env")) {
  Copy-Item ".env.example" ".env"
  $secret = python -c "import secrets; print(secrets.token_hex(32))"
  (Get-Content ".env" -Raw) -replace "change_me_64_char_random_secret_key_here_very_long", $secret | Set-Content ".env"
}

New-Item -ItemType Directory -Force "backend\media", "backend\hls" | Out-Null
python -m venv .venv
& ".\.venv\Scripts\python.exe" -m pip install -r "backend\requirements.txt"
Set-Location "$Root\backend"
& "$Root\.venv\Scripts\python.exe" manage.py migrate

Write-Host "NovaStream Django backend is ready."
Write-Host "Start the full local stack, including FFmpeg worker:"
Write-Host "powershell -ExecutionPolicy Bypass -File scripts\start-local.ps1"

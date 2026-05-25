param(
  [string]$Email = "admin@novastream.local"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location "$Root\backend"
python manage.py make_admin $Email

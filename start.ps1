# ============================================================
#  Ann-Sanjivani AI — Single-Command Launcher (Windows)
#  Usage:  .\start.ps1    OR  double-click start.bat
# ============================================================
$ErrorActionPreference = "SilentlyContinue"
$root     = $PSScriptRoot
$backend  = Join-Path $root "backend"
$frontend = Join-Path $root "frontend"

# Resolve python: shared venv ../.venv  OR  local venv
$parentVenv = Join-Path $root ".." ".venv"
$localVenv  = Join-Path $backend ".venv"
$legacyVenv = Join-Path $backend "venv"
if     (Test-Path (Join-Path $parentVenv "Scripts\python.exe")) { $python = Join-Path $parentVenv "Scripts\python.exe"; $pip = Join-Path $parentVenv "Scripts\pip.exe"; $venvPath = $parentVenv }
elseif (Test-Path (Join-Path $localVenv  "Scripts\python.exe")) { $python = Join-Path $localVenv  "Scripts\python.exe"; $pip = Join-Path $localVenv  "Scripts\pip.exe";  $venvPath = $localVenv  }
elseif (Test-Path (Join-Path $legacyVenv "Scripts\python.exe")) { $python = Join-Path $legacyVenv "Scripts\python.exe"; $pip = Join-Path $legacyVenv "Scripts\pip.exe";  $venvPath = $legacyVenv }
else { $python = $null; $venvPath = $localVenv }

function Write-Step($msg) { Write-Host ""; Write-Host "  >> $msg" -ForegroundColor Cyan }
function Check-Command($cmd) { return (Get-Command $cmd -ErrorAction SilentlyContinue) -ne $null }

Clear-Host
Write-Host ""
Write-Host "  ╔══════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "  ║    Ann-Sanjivani AI  •  Food Rescue       ║" -ForegroundColor Green
Write-Host "  ║         Single-Command Launcher           ║" -ForegroundColor Green
Write-Host "  ╚══════════════════════════════════════════╝" -ForegroundColor Green

Write-Step "Checking Python..."
if (-not (Check-Command "python")) { Write-Host "  ERROR: Install Python 3.10+ from https://python.org" -ForegroundColor Red; exit 1 }
Write-Host "  Found: $(python --version 2>&1)" -ForegroundColor Green

Write-Step "Checking Node.js..."
if (-not (Check-Command "node")) { Write-Host "  ERROR: Install Node.js 18+ from https://nodejs.org" -ForegroundColor Red; exit 1 }
Write-Host "  Found: Node $(node --version)" -ForegroundColor Green

Write-Step "Setting up Python virtual environment..."
if ($null -eq $python) {
    Write-Host "  Creating venv at $localVenv ..." -ForegroundColor Yellow
    python -m venv $localVenv
    $python = Join-Path $localVenv "Scripts\python.exe"; $pip = Join-Path $localVenv "Scripts\pip.exe"; $venvPath = $localVenv
    Write-Host "  venv created." -ForegroundColor Green
} else { Write-Host "  Using: $venvPath" -ForegroundColor Green }

Write-Step "Installing Python dependencies..."
& $pip install -r (Join-Path $backend "requirements.txt") --quiet --exists-action i 2>&1 | Out-Null
Write-Host "  Python dependencies ready." -ForegroundColor Green

Write-Step "Checking Node.js dependencies..."
if (-not (Test-Path (Join-Path $frontend "node_modules"))) {
    Write-Host "  Installing npm packages (~1 min first run)..." -ForegroundColor Yellow
    Push-Location $frontend; npm install --silent 2>&1 | Out-Null; Pop-Location
    Write-Host "  npm packages installed." -ForegroundColor Green
} else { Write-Host "  node_modules already present." -ForegroundColor Green }

$occupied = Get-NetTCPConnection -LocalPort 8001 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
if ($occupied) { $occupied | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }; Start-Sleep 1 }

Write-Step "Starting Backend on http://localhost:8001 ..."
$backendCmd = "Set-Location '$backend'; & '$python' -m uvicorn main:app --reload --host 0.0.0.0 --port 8001; Read-Host 'Press Enter to close'"
Start-Process powershell -ArgumentList "-NoExit","-Command",$backendCmd -WindowStyle Normal
Start-Sleep 5

Write-Step "Starting Frontend on http://localhost:5173 ..."
$frontendCmd = "Set-Location '$frontend'; npm run dev; Read-Host 'Press Enter to close'"
Start-Process powershell -ArgumentList "-NoExit","-Command",$frontendCmd -WindowStyle Normal
Start-Sleep 4

Write-Host ""
Write-Host "  ╔══════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "  ║             App is LIVE!                 ║" -ForegroundColor Green
Write-Host "  ╠══════════════════════════════════════════╣" -ForegroundColor Green
Write-Host "  ║  Frontend  ->  http://localhost:5173     ║" -ForegroundColor White
Write-Host "  ║  Backend   ->  http://localhost:8001     ║" -ForegroundColor White
Write-Host "  ║  API Docs  ->  http://localhost:8001/docs ║" -ForegroundColor White
Write-Host "  ╠══════════════════════════════════════════╣" -ForegroundColor Green
Write-Host "  ║  Login:  restaurant1@foodrescue.in       ║" -ForegroundColor Yellow
Write-Host "  ║  Pass:   demo123                         ║" -ForegroundColor Yellow
Write-Host "  ╚══════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Start-Process "http://localhost:5173"

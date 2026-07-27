#Requires -Version 5.1
<#
.SYNOPSIS
  Start the AGXORA Next.js dev server from the single active project root.

.DESCRIPTION
  - Resolves agxora-v2 (or app\agxora-v2)
  - Verifies Git repository
  - Pulls latest origin/main (fast-forward)
  - Installs npm packages if node_modules is missing
  - Runs npm run dev

  Official local path: C:\Users\texti\agxora\app\agxora-v2
#>

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

function Resolve-AgxoraAppRoot {
  param([string]$Base)

  $candidates = @(
    (Join-Path $Base "agxora-v2"),
    (Join-Path $Base "app\agxora-v2"),
    $Base
  )

  foreach ($candidate in $candidates) {
    $pkg = Join-Path $candidate "package.json"
    if (-not (Test-Path -LiteralPath $pkg)) { continue }
    try {
      $json = Get-Content -LiteralPath $pkg -Raw | ConvertFrom-Json
      if ($json.name -eq "agxora-v2") {
        return (Resolve-Path -LiteralPath $candidate).Path
      }
    } catch {
      continue
    }
  }

  return $null
}

$AppDir = Resolve-AgxoraAppRoot -Base $ScriptDir
if (-not $AppDir) {
  Write-Host "[ERROR] Could not locate agxora-v2 package.json" -ForegroundColor Red
  Write-Host "Expected under: $ScriptDir\agxora-v2  OR  $ScriptDir\app\agxora-v2"
  Write-Host "Official path: C:\Users\texti\agxora\app\agxora-v2"
  exit 1
}

Write-Host "[AGXORA] Project root: $AppDir" -ForegroundColor Cyan
Set-Location -LiteralPath $AppDir

try {
  $GitRoot = (git -C $AppDir rev-parse --show-toplevel 2>$null).Trim()
} catch {
  $GitRoot = $null
}

if (-not $GitRoot) {
  Write-Host "[ERROR] Not a Git repository (git rev-parse failed for $AppDir)" -ForegroundColor Red
  exit 1
}

Write-Host "[AGXORA] Git root: $GitRoot" -ForegroundColor Cyan
Write-Host "[AGXORA] Fetching and pulling origin/main ..."

try {
  git -C $GitRoot fetch origin main
  git -C $GitRoot pull --ff-only origin main
} catch {
  Write-Host "[WARN] git fetch/pull issue — continuing with local tree: $_" -ForegroundColor Yellow
}

$nodeModules = Join-Path $AppDir "node_modules"
if (-not (Test-Path -LiteralPath $nodeModules)) {
  Write-Host "[AGXORA] node_modules missing — running npm install ..." -ForegroundColor Yellow
  npm install
  if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] npm install failed" -ForegroundColor Red
    exit $LASTEXITCODE
  }
} else {
  Write-Host "[AGXORA] node_modules present"
}

Write-Host "[AGXORA] Starting Next.js (npm run dev) from agxora-v2 ..." -ForegroundColor Green
npm run dev
exit $LASTEXITCODE

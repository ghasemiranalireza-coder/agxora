@echo off
setlocal EnableExtensions
title AGXORA Dev Server

rem AGXORA start-dev.bat
rem Starts the single active Next.js app: agxora-v2
rem Official local path: C:\Users\texti\agxora\app\agxora-v2

set "SCRIPT_DIR=%~dp0"
set "APP_DIR="

if exist "%SCRIPT_DIR%agxora-v2\package.json" (
  set "APP_DIR=%SCRIPT_DIR%agxora-v2"
) else if exist "%SCRIPT_DIR%app\agxora-v2\package.json" (
  set "APP_DIR=%SCRIPT_DIR%app\agxora-v2"
) else if exist "%SCRIPT_DIR%package.json" (
  rem Script may live inside the app folder
  findstr /C:"\"name\": \"agxora-v2\"" "%SCRIPT_DIR%package.json" >nul 2>&1
  if not errorlevel 1 set "APP_DIR=%SCRIPT_DIR%"
)

if not defined APP_DIR (
  echo [ERROR] Could not locate agxora-v2 package.json
  echo Expected: %SCRIPT_DIR%agxora-v2  OR  %SCRIPT_DIR%app\agxora-v2
  echo Official path: C:\Users\texti\agxora\app\agxora-v2
  exit /b 1
)

echo [AGXORA] Project root: %APP_DIR%
cd /d "%APP_DIR%" || exit /b 1

rem Prefer git repo root for pull (may be parent of agxora-v2)
set "GIT_ROOT=%APP_DIR%"
for /f "delims=" %%i in ('git -C "%APP_DIR%" rev-parse --show-toplevel 2^>nul') do set "GIT_ROOT=%%i"

if not exist "%GIT_ROOT%\.git" if not exist "%GIT_ROOT%\.git\" (
  echo [ERROR] Not a Git repository: %GIT_ROOT%
  exit /b 1
)

echo [AGXORA] Git root: %GIT_ROOT%
echo [AGXORA] Fetching and pulling origin/main ...
git -C "%GIT_ROOT%" fetch origin main
if errorlevel 1 (
  echo [WARN] git fetch failed — continuing with local tree
) else (
  git -C "%GIT_ROOT%" pull --ff-only origin main
  if errorlevel 1 echo [WARN] git pull did not fast-forward — continuing with local tree
)

if not exist "%APP_DIR%\node_modules\" (
  echo [AGXORA] node_modules missing — running npm install ...
  call npm install
  if errorlevel 1 (
    echo [ERROR] npm install failed
    exit /b 1
  )
) else (
  echo [AGXORA] node_modules present
)

echo [AGXORA] Starting Next.js (npm run dev) from agxora-v2 ...
call npm run dev
exit /b %ERRORLEVEL%

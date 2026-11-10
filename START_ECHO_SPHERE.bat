@echo off
setlocal
cd /d "%~dp0"
title Echo Sphere - Local Setup

echo.
echo ========================================
echo          ECHO SPHERE STARTER
echo ========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed or is not on PATH.
  echo Please install the LTS version from https://nodejs.org/
  echo Then close and reopen this window and double-click this file again.
  echo.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo npm was not found. Reinstall Node.js LTS and ensure npm is included.
  pause
  exit /b 1
)

echo Node.js version:
node --version
echo.
echo Installing project dependencies. This may take a few minutes...
npm install
if errorlevel 1 (
  echo.
  echo Dependency installation failed. Check your internet connection and try again.
  pause
  exit /b 1
)

echo.
echo Starting Echo Sphere...
start "Echo Sphere Dev Server" cmd /k "cd /d "%~dp0" && npm run dev"
timeout /t 4 /nobreak >nul
start "" "http://localhost:5173"
echo.
echo Echo Sphere should now open in your browser.
echo Keep the Dev Server window open while using the site.
echo To stop it, click that window and press Ctrl+C.
echo.
pause

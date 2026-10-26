@echo off
chcp 65001 >nul
title Installation du relais imprimantes FAZA 3D
net session >nul 2>&1
if %errorlevel% neq 0 (
  echo Autorisation administrateur necessaire : cliquez sur "Oui".
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0installer-relais.ps1"
echo.
pause

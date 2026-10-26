@echo off
chcp 65001 >nul
net session >nul 2>&1
if %errorlevel% neq 0 ( powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs" & exit /b )
powershell -NoProfile -Command "Stop-ScheduledTask -TaskName 'FAZA3D-Relais' -ErrorAction SilentlyContinue; Unregister-ScheduledTask -TaskName 'FAZA3D-Relais' -Confirm:$false -ErrorAction SilentlyContinue; Get-Process node -ErrorAction SilentlyContinue | Where-Object { $_.Path -like 'C:\FAZA3D-Relais*' -or $_.CommandLine -like '*relais.js*' } | Stop-Process -Force -ErrorAction SilentlyContinue"
echo Relais arrete et retire du demarrage automatique. Le dossier C:\FAZA3D-Relais peut etre supprime.
pause

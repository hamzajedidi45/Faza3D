# Installe le relais imprimantes FAZA 3D sur ce PC de l'atelier : démarre avec Windows, sans fenêtre.
$ErrorActionPreference = 'Stop'
$Src  = Split-Path -Parent $MyInvocation.MyCommand.Path
$Dest = 'C:\FAZA3D-Relais'
$Task = 'FAZA3D-Relais'
function Ok($t) { Write-Host "   OK  $t" -ForegroundColor Green }
function Arret($t) { Write-Host "   $t" -ForegroundColor Red; exit 1 }
Write-Host 'Relais imprimantes FAZA 3D : installation' -ForegroundColor White
try {
$cfg = Get-Content (Join-Path $Src 'config.json') -Raw | ConvertFrom-Json
if ($cfg.jeton -like 'COLLER-*' -or -not $cfg.jeton) { Arret "Ouvrez config.json et collez le jeton du relais (plateforme > Connexions > Relais imprimantes) et l'adresse de la plateforme." }
if ($cfg.serveur -like '*VOTRE-DOMAINE*') { Arret "Ouvrez config.json et indiquez l'adresse de la plateforme (serveur)." }
$Node = (Get-Command node.exe -ErrorAction SilentlyContinue).Source
if (-not $Node) { foreach ($p in @("$env:ProgramFiles\nodejs\node.exe")) { if (Test-Path $p) { $Node = $p } } }
if (-not $Node) {
  if (Get-Command winget.exe -ErrorAction SilentlyContinue) { & winget install --id OpenJS.NodeJS.LTS -e --silent --accept-package-agreements --accept-source-agreements | Out-Host; $env:Path = [Environment]::GetEnvironmentVariable('Path','Machine'); $Node = (Get-Command node.exe -ErrorAction SilentlyContinue).Source }
  if (-not $Node) { Start-Process 'https://nodejs.org/fr/download'; Arret 'Installez Node.js (LTS) puis relancez.' }
}
Ok "Node.js $(& $Node -v)"
if (Get-ScheduledTask -TaskName $Task -ErrorAction SilentlyContinue) { Stop-ScheduledTask -TaskName $Task -ErrorAction SilentlyContinue }
New-Item -ItemType Directory -Force -Path $Dest | Out-Null
Copy-Item "$Src\*" $Dest -Recurse -Force
Get-ChildItem -Path $Dest -Recurse -File | Unblock-File -ErrorAction SilentlyContinue
if (-not (Test-Path "$Dest\node_modules\mqtt")) { $npm = Join-Path (Split-Path $Node) 'npm.cmd'; Push-Location $Dest; & $npm install --omit=dev --no-audit --no-fund | Out-Host; Pop-Location }
if (-not (Test-Path "$Dest\node_modules\mqtt")) { Arret 'Modules non installés (internet ?).' }
Ok "Relais copié dans $Dest"
$cmd = "@echo off`r`ncd /d `"$Dest`"`r`nif not exist journaux mkdir journaux`r`n:boucle`r`nif exist journaux\relais.log for %%F in (journaux\relais.log) do if %%~zF GTR 3000000 move /y journaux\relais.log journaux\relais-ancien.log >nul`r`n`"$Node`" relais.js >> journaux\relais.log 2>&1`r`nping -n 11 127.0.0.1 >nul`r`ngoto boucle`r`n"
[IO.File]::WriteAllText("$Dest\demarrer.cmd", $cmd, [Text.Encoding]::Default)
$action = New-ScheduledTaskAction -Execute "$env:SystemRoot\System32\cmd.exe" -Argument "/c `"$Dest\demarrer.cmd`"" -WorkingDirectory $Dest
$trigger = New-ScheduledTaskTrigger -AtStartup
$principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -MultipleInstances IgnoreNew
Register-ScheduledTask -TaskName $Task -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description 'Relais imprimantes FAZA 3D' -Force | Out-Null
Start-ScheduledTask -TaskName $Task
& icacls "$Dest" /inheritance:r /grant:r '*S-1-5-18:(OI)(CI)F' '*S-1-5-32-544:(OI)(CI)F' /T /C /Q | Out-Null
Ok 'Le relais démarre avec Windows. Journal : C:\FAZA3D-Relais\journaux\relais.log'
Write-Host 'Dans la plateforme, Connexions > Relais imprimantes doit passer à « connecté » dans la minute.'
} catch { Write-Host "Erreur : $($_.Exception.Message)" -ForegroundColor Red; exit 1 }

#Requires -Version 5.1
<#
.SYNOPSIS
  Push seguro del proyecto VaneQuiros a GitHub.

.DESCRIPTION
  - Verifica que archivos sensibles no esten en staging
  - Confirma que firebase-config.js esta en .gitignore
  - Hace commit (opcional) y push a origin/main

.EXAMPLE
  .\scripts\push-seguro.ps1 -Mensaje "Actualizar rifa y documentacion"

.EXAMPLE
  .\scripts\push-seguro.ps1 -Mensaje "Fix grid" -SinCommit
#>
param(
  [Parameter(Mandatory = $true)]
  [string]$Mensaje,

  [switch]$SinCommit
)

$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path $PSScriptRoot -Parent
Set-Location $RepoRoot

Write-Host "`n=== Push seguro — VaneQuiros ===" -ForegroundColor Cyan
Write-Host "Directorio: $RepoRoot`n"

if (-not (Test-Path ".git")) {
  Write-Error "No hay repositorio git aqui. Ejecuta desde la carpeta WebSite."
}

$ForbiddenPatterns = @(
  "firebase-config.js",
  ".env",
  "firebase-adminsdk",
  "serviceAccount",
  ".firebase"
)

function Test-StagedForbidden {
  $staged = git diff --cached --name-only 2>$null
  if (-not $staged) { return @() }

  $violations = @()
  foreach ($file in $staged) {
    foreach ($pattern in $ForbiddenPatterns) {
      if ($file -like "*$pattern*") {
        if ($file -like "*firebase-config.example.js") { continue }
        $violations += $file
      }
    }
  }
  return $violations | Select-Object -Unique
}

$ignoreCheck = git check-ignore -v "js/web-rifa/firebase-config.js" 2>$null
if (-not $ignoreCheck) {
  Write-Warning "js/web-rifa/firebase-config.js NO esta en .gitignore."
  $confirm = Read-Host "Continuar de todos modos? (s/N)"
  if ($confirm -ne "s") { exit 1 }
} else {
  Write-Host "[OK] firebase-config.js ignorado:" -ForegroundColor Green
  Write-Host "     $ignoreCheck"
}

Write-Host "`n--- git status ---" -ForegroundColor Yellow
git status --short

if (-not $SinCommit) {
  git add .

  $violations = Test-StagedForbidden
  if ($violations.Count -gt 0) {
    Write-Host "`n[ERROR] Archivos sensibles en staging. Push cancelado:" -ForegroundColor Red
    $violations | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
    exit 1
  }

  git diff --cached --quiet 2>$null
  if ($LASTEXITCODE -ne 0) {
    Write-Host "`n--- Commit ---" -ForegroundColor Yellow
    git -c user.email="vanessaquirosv@users.noreply.github.com" `
        -c user.name="Vanessa Quiros" `
        commit -m $Mensaje
    if ($LASTEXITCODE -ne 0) { Write-Error "Fallo el commit." }
    Write-Host "[OK] Commit creado." -ForegroundColor Green
  } else {
    Write-Host "`n[INFO] No hay cambios nuevos para commitear." -ForegroundColor Gray
  }
}

Write-Host "`n--- Push origin main ---" -ForegroundColor Yellow
git push origin main
if ($LASTEXITCODE -ne 0) { Write-Error "Fallo el push." }

Write-Host "`n[OK] Push completado." -ForegroundColor Green
Write-Host "Repo: https://github.com/vanessaquirosv/vanequiros/commits/main"
Write-Host "Actions: https://github.com/vanessaquirosv/vanequiros/actions`n"

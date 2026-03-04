# ============================================================
# daily-sync.ps1 — Sincroniza el día anterior y reentrena
# Uso: .\scripts\daily-sync.ps1
# Se corre cada día automáticamente (o manualmente al iniciar).
# Requiere que el backend y ML service estén corriendo.
# ============================================================

param(
    [string]$BackendUrl  = "http://localhost:4000",
    [string]$MlServicesPath = "$PSScriptRoot\..\ml-services"
)

$yesterday = (Get-Date).AddDays(-1).ToString("yyyy-MM-dd")
$today     = (Get-Date).ToString("yyyy-MM-dd")

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  DAILY SYNC — Football AI" -ForegroundColor Cyan
Write-Host "  $(Get-Date -Format 'yyyy-MM-dd HH:mm')" -ForegroundColor Gray
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# ─── 1. Sync ayer (partidos terminados con stats) ────────
Write-Host "▶ Sincronizando $yesterday (partidos finalizados)..." -ForegroundColor Blue
try {
    $res = Invoke-RestMethod -Method POST "$BackendUrl/api/matches/sync/$yesterday" -TimeoutSec 60
    Write-Host "  ✅ $($res.count) partidos de ayer guardados" -ForegroundColor Green
} catch {
    Write-Host "  ⚠️  Error sincronizando ayer: $_" -ForegroundColor Yellow
}

# ─── 2. Sync hoy (partidos del día) ──────────────────────
Write-Host "▶ Sincronizando $today (partidos de hoy)..." -ForegroundColor Blue
try {
    $res = Invoke-RestMethod -Method POST "$BackendUrl/api/matches/sync/$today" -TimeoutSec 60
    Write-Host "  ✅ $($res.count) partidos de hoy guardados" -ForegroundColor Green
} catch {
    Write-Host "  ⚠️  Error sincronizando hoy: $_" -ForegroundColor Yellow
}

# ─── 3. Verificar cuántos datos FT hay para entrenar ─────
Write-Host "▶ Verificando dataset..." -ForegroundColor Blue
try {
    $dataset = Invoke-RestMethod -Method GET "$BackendUrl/api/matches/dataset" -TimeoutSec 30
    $count   = $dataset.Count
    Write-Host "  📊 Dataset actual: $count partidos FT con stats" -ForegroundColor White

    # ─── 4. Reentrenar si hay suficientes datos ──────────
    if ($count -ge 200) {
        Write-Host ""
        Write-Host "▶ Reentrenando modelos ML..." -ForegroundColor Yellow
        
        $trainerPath = Join-Path $MlServicesPath "trainer.py"
        $venvPython  = Join-Path $MlServicesPath "venv\Scripts\python.exe"

        if (Test-Path $venvPython) {
            $result = & $venvPython $trainerPath 2>&1
            Write-Host $result -ForegroundColor Gray
            Write-Host "  ✅ Modelos reentrenados" -ForegroundColor Green
            Write-Host ""
            Write-Host "  ⚠️  Reinicia el ML Service para cargar los nuevos modelos:" -ForegroundColor Yellow
            Write-Host "      Cierra la ventana del ML Service y corre start.ps1 de nuevo" -ForegroundColor White
        } else {
            Write-Host "  ⚠️  No se encontró el venv en $MlServicesPath" -ForegroundColor Yellow
            Write-Host "      Entrena manualmente: cd ml-services && python trainer.py" -ForegroundColor White
        }
    } else {
        Write-Host "  ℹ️  Solo $count partidos — necesitas 200+ para reentrenar" -ForegroundColor Gray
        Write-Host "      Corre seed-historical.ps1 si aún no lo hiciste" -ForegroundColor White
    }
} catch {
    Write-Host "  ⚠️  No se pudo verificar el dataset: $_" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  SYNC COMPLETADO — Abre http://localhost:5173" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
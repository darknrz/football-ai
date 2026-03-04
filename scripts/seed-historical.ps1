# ============================================================
# seed-historical.ps1 — Pobla datos históricos desde ago 2024
# Uso: .\scripts\seed-historical.ps1
# SOLO SE CORRE UNA VEZ. Tarda ~2-3 horas.
# Requiere que el backend esté corriendo en puerto 4000.
# ============================================================

param(
    [string]$From = "2024-08-01",
    [string]$BackendUrl = "http://localhost:4000"
)

$start   = [datetime]::Parse($From)
$end     = (Get-Date).AddDays(-1).Date
$current = $start
$total   = 0
$errors  = 0
$days    = ($end - $start).Days + 1

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  SEED HISTÓRICO — Football AI" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Desde : $($start.ToString('yyyy-MM-dd'))" -ForegroundColor White
Write-Host "  Hasta : $($end.ToString('yyyy-MM-dd'))" -ForegroundColor White
Write-Host "  Días  : $days" -ForegroundColor White
Write-Host "  Tiempo estimado: ~$([math]::Round($days * 1.5 / 60, 1)) minutos" -ForegroundColor White
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  No cierres esta ventana. Espera a que termine." -ForegroundColor Yellow
Write-Host ""

$i = 0
while ($current -le $end) {
    $i++
    $date = $current.ToString("yyyy-MM-dd")
    $pct  = [math]::Round(($i / $days) * 100)
    
    Write-Host "[$pct%] $date" -NoNewline -ForegroundColor Gray

    try {
        $res   = Invoke-RestMethod -Method POST "$BackendUrl/api/matches/sync/$date" -TimeoutSec 60
        $count = $res.count
        $total += $count
        Write-Host " → ✅ $count partidos" -ForegroundColor Green
    } catch {
        $errors++
        Write-Host " → ⚠️  error (API limit o sin partidos)" -ForegroundColor Yellow
    }

    # 1.5s entre requests para no saturar la API de fútbol
    Start-Sleep -Milliseconds 1500
    $current = $current.AddDays(1)
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  SEED COMPLETADO" -ForegroundColor Green
Write-Host "  Total partidos guardados : $total" -ForegroundColor White
Write-Host "  Días con error           : $errors" -ForegroundColor White
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Siguiente paso — entrenar los modelos:" -ForegroundColor White
Write-Host "  cd ml-services" -ForegroundColor Yellow
Write-Host "  venv\Scripts\Activate.ps1" -ForegroundColor Yellow
Write-Host "  python trainer.py" -ForegroundColor Yellow
Write-Host ""
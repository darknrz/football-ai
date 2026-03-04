# ============================================================
# start.ps1 — Arranca Football AI completo
# Uso: .\start.ps1
# ============================================================

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "   FOOTBALL AI — Iniciando servicios  " -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# ─── Backend ─────────────────────────────────────────────
Write-Host "▶ Iniciando Backend (puerto 4000)..." -ForegroundColor Blue
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$root\backend'; Write-Host 'BACKEND' -ForegroundColor Blue; npx tsx src/server"
)

Start-Sleep -Seconds 2

# ─── ML Service ──────────────────────────────────────────
Write-Host "▶ Iniciando ML Service (puerto 8000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$root\ml-services'; Write-Host 'ML SERVICE' -ForegroundColor Yellow; venv\Scripts\Activate.ps1; uvicorn app:app --reload --port 8000"
)

Start-Sleep -Seconds 2

# ─── Frontend ────────────────────────────────────────────
Write-Host "▶ Iniciando Frontend (puerto 5173)..." -ForegroundColor Green
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$root\frontend'; Write-Host 'FRONTEND' -ForegroundColor Green; npm run dev"
)

Write-Host ""
Write-Host "✅ Todo iniciado. Abre http://localhost:5173" -ForegroundColor Green
Write-Host ""
Write-Host "  Backend   → http://localhost:4000" -ForegroundColor Blue
Write-Host "  ML Service→ http://localhost:8000/docs" -ForegroundColor Yellow
Write-Host "  Frontend  → http://localhost:5173" -ForegroundColor Green
Write-Host ""
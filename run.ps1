# NeuroQuest PowerShell Launcher
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  Launching NeuroQuest: Gamified Deep Learning Studio   " -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Cyan

# Start Backend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "python -m uvicorn server.main:app --port 8000"
Start-Sleep -Seconds 2

# Start Frontend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd client; npm run dev -- --host --port 5173"
Start-Sleep -Seconds 2

# Open browser
Start-Process "http://localhost:5173"

Write-Host "NeuroQuest services launched at http://localhost:5173!" -ForegroundColor Green

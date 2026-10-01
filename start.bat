@echo off
echo ========================================================
echo   Launching NeuroQuest: Gamified Deep Learning Studio
echo ========================================================

echo Starting Python FastAPI & PyTorch Engine on port 8000...
start "NeuroQuest Engine" cmd /k "python -m uvicorn server.main:app --port 8000"

timeout /t 2 /nobreak >nul

echo Starting Vite Dev Server on port 5173...
cd client
start "NeuroQuest Web" cmd /k "npm run dev -- --host --port 5173"

timeout /t 2 /nobreak >nul
echo Opening NeuroQuest in default browser...
start http://localhost:5173

echo.
echo All services launched! Press any key to exit this launcher window.
pause >nul

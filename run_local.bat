@echo off
echo Starting VisionCare AI Project...

:: Get absolute path of script directory
set "PROJECT_DIR=%~dp0"

echo Project Directory: %PROJECT_DIR%

:: 1. Start Backend in a new window
echo Launching Backend...
start "VisionCare AI Backend" cmd /k "cd /d %PROJECT_DIR%backend && echo Setting up Python Virtual Environment... && (if not exist .venv python -m venv .venv) && call .venv\Scripts\activate && echo Installing Backend Dependencies... && pip install -r requirements.txt && echo Starting Backend Server... && uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"

:: 2. Start Frontend in a new window
echo Launching Frontend...
start "VisionCare AI Frontend" cmd /k "cd /d %PROJECT_DIR%visioncare-frontend && echo Installing Frontend Dependencies... && npm install --legacy-peer-deps && echo Starting Frontend Server... && npm start"

echo.
echo Both servers have been launched in separate windows!
echo Backend API Docs: http://127.0.0.1:8000/docs
echo Frontend: http://localhost:3000
echo.
pause

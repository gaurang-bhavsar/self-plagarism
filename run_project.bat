@echo off
setlocal
set "SCRIPT_DIR=%~dp0"
set "PY=python"
%PY% --version >nul 2>&1
if errorlevel 1 (
    set "PY=py -3"
    %PY% --version >nul 2>&1
    if errorlevel 1 (
        echo Python 3 is not available on PATH. Please install Python 3 and retry.
        pause
        exit /b 1
    )
)
echo Using Python: %PY%
echo Installing dependencies from "%SCRIPT_DIR%requirements.txt"...
"%PY%" -m pip install -r "%SCRIPT_DIR%requirements.txt"
if errorlevel 1 (
    echo Failed to install dependencies.
    pause
    exit /b 1
)
echo Starting backend and frontend...
start "SelfPlagiarism Backend" cmd /k "cd /d "%SCRIPT_DIR%backend" && "%PY%" app.py"
start "SelfPlagiarism Frontend" cmd /k "cd /d "%SCRIPT_DIR%frontend" && "%PY%" -m http.server 8000"
echo Backend: http://127.0.0.1:5000
echo Frontend: http://127.0.0.1:8000
pause
endlocal
exit /b 0

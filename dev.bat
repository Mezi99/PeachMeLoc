@echo off
echo ========================================
echo   PeachMe - Starting Development Server
echo ========================================
echo.

echo [1/3] Clearing Next.js cache...
if exist .next rmdir /s /q .next
echo Done.
echo.

echo [2/3] Installing dependencies...
call npm install
if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)
echo Done.
echo.

echo [3/3] Starting development server...
echo.
echo The app will be available at: http://localhost:3000
echo Press Ctrl+C to stop the server
echo.
call npm run dev

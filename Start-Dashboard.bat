@echo off
chcp 65001 >nul
title Discord Rich Presence - Dashboard
cd /d "%~dp0"

echo ========================================================
echo   DISCORD RICH PRESENCE PLUGIN
echo   Hien thi: Che do, Ten hoat dong, Trang thai, Model, Thoi gian
echo ========================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [LOI] May tinh chua cai dat Node.js! Vui long tai tai https://nodejs.org/
    pause
    exit /b 1
)

echo Dang khoi dong Bang dieu khien tai: http://127.0.0.1:3847
start "" "http://127.0.0.1:3847"
node dashboard.js
pause

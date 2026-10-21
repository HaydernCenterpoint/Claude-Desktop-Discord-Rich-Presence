@echo off
chcp 65001 >nul
title Cai dat Tu Dong Khoi Chay Discord RPC khi mo Claude
cd /d "%~dp0"

echo ================================================================
echo   TICH HOP TU DONG CHAY DISCORD RICH PRESENCE KHI MO CLAUDE
echo ================================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [LOI] May tinh chua cai dat Node.js! Vui long cai Node.js tai https://nodejs.org/
    pause
    exit /b 1
)

node install-claude-mcp.js
echo.
pause

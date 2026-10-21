@echo off
chcp 65001 >nul
title Push to GitHub - Claude Desktop Discord Rich Presence
cd /d "%~dp0"

echo ====================================================================
echo   PUBLISHING "Claude-Desktop-Discord-Rich-Presence" TO GITHUB
echo ====================================================================
echo.

del /F /Q ".git\index.lock" >nul 2>nul
del /F /Q ".git\HEAD.lock" >nul 2>nul

node auto-github-publish.js

type github-published.json 2>nul
echo.
echo ====================================================================
echo   Link Repo: https://github.com/HaydernCenterpoint/Claude-Desktop-Discord-Rich-Presence
echo ====================================================================
start "" "https://github.com/HaydernCenterpoint/Claude-Desktop-Discord-Rich-Presence"
pause

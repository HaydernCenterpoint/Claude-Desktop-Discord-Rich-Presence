@echo off
chcp 65001 >nul
title Push to GitHub - Claude Desktop Discord Rich Presence
cd /d "%~dp0"

echo ====================================================================
echo   PUBLISHING "Claude-Desktop-Discord-Rich-Presence" TO GITHUB
echo ====================================================================
echo.

git init
git branch -M main
git add -A
git commit -m "feat: Claude Desktop Discord Rich Presence with animated Clawd, inline SVG provider logos, terminal thinking box, token stats & GitHub diff bar"

where gh >nul 2>nul
if %errorlevel% equ 0 (
    echo Dang tao va day repo len GitHub qua GitHub CLI...
    gh repo create Claude-Desktop-Discord-Rich-Presence --public --description "Live Discord Rich Presence for Claude Desktop & Claude Code with 13 animated Clawd scenes, inline SVG provider logos, terminal thinking box, token stats & GitHub diff bar" --source=. --remote=origin --push
) else (
    echo Dang day len https://github.com/HaydernCenterpoint/Claude-Desktop-Discord-Rich-Presence.git ...
    git remote remove origin >nul 2>nul
    git remote add origin https://github.com/HaydernCenterpoint/Claude-Desktop-Discord-Rich-Presence.git
    git push -u origin main
)

echo.
echo ====================================================================
echo   Link Repo: https://github.com/HaydernCenterpoint/Claude-Desktop-Discord-Rich-Presence
echo ====================================================================
pause

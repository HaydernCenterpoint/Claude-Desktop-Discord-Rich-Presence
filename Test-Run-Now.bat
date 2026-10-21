@echo off
chcp 65001 >nul
title Kiem Tra & Hien Thi Ngay Discord Rich Presence
cd /d "%~dp0"

echo ================================================================
echo   KIEM TRA VA BAT NGAY DISCORD RICH PRESENCE TREN MAY BAN
echo ================================================================
echo.
echo LUU Y QUAN TRONG TRONG CAI DAT DISCORD:
echo   Vao Discord Settings (Banh rang) -^> Activity Privacy (Quyen rieng tu hoat dong)
echo   Hay chac chan rang ban DA BAT: "Share your detected activities with others"
echo   (Chia se hoat dong cua ban voi nguoi khac)
echo ================================================================
echo.

node -e "const fs = require('fs'); const { DiscordIPC } = require('./discord-ipc'); const cfg = JSON.parse(fs.readFileSync('./config.json', 'utf8')); const rpc = new DiscordIPC(cfg.clientId, (m) => console.log(m)); rpc.setActivity(cfg); rpc.connect(); setInterval(() => {}, 10000);"
pause

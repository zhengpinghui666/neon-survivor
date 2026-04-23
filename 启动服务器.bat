@echo off
chcp 65001 >nul
title 霓虹幸存者 - 游戏服务器
cd /d "%~dp0"

echo.
echo  ╔═══════════════════════════╗
echo  ║   霓虹幸存者 - 启动中...  ║
echo  ╚═══════════════════════════╝
echo.

:: 构建最新版本
echo [1/3] 构建游戏...
call npm run build >nul 2>&1
echo       完成!

:: 启动游戏服务器
echo [2/3] 启动服务器...
start /b node server.js
timeout /t 2 /nobreak >nul
echo       http://localhost:4200

:: 启动CF隧道
echo [3/3] 创建外网隧道...
echo.
echo  等待隧道地址...
echo  ─────────────────────────────
npx cloudflared tunnel --url http://localhost:4200

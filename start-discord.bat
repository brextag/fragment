@echo off
title Discord Clone Messenger
echo ==============================================
echo        Starting Discord Clone Messenger
echo ==============================================
echo.
echo Launching backend server on http://localhost:3001...
start "" http://localhost:3001
node server/index.js
pause

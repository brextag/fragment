@echo off
title Fragment Messenger
echo ==============================================
echo           Starting Fragment Messenger
echo ==============================================
echo.
echo Launching server on http://localhost:3001...
start "" http://localhost:3001
node server/index.js
pause

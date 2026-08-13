@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Gesture Synth BR - servidor local

echo.
echo Gesture Synth BR
echo Iniciando servidor local sem precisar instalar Python...
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0SERVIDOR_LOCAL.ps1"

@echo off
cd /d "%~dp0"
echo Iniciando servidor local (Next.js)...
call npm run dev
pause

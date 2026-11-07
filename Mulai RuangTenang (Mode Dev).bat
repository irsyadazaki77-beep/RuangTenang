@echo off
setlocal
cd /d "%~dp0"
title RuangTenang (Dev Mode)
echo [INFO] Menyalakan RuangTenang dalam Mode Pengembang (Hot-Reload)...
call npm run dev
endlocal

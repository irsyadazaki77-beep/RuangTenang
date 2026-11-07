@echo off
setlocal
cd /d "%~dp0"

title RuangTenang AI Launcher

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js belum terpasang di PATH.
  echo Silakan unduh dan pasang Node.js versi 22.12 atau terbaru dari https://nodejs.org
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo [INFO] Dependensi belum terpasang. Menjalankan npm install...
  call npm install --no-audit --no-fund
)

set "PORT=3005"
if exist ".env" (
  for /f "usebackq tokens=1,2 delims==" %%A in (".env") do (
    if "%%A"=="PORT" set "PORT=%%B"
  )
)

rem --- Single-Instance Check: jika sudah aktif, langsung buka aplikasi ---
curl.exe -f -s -m 1 "http://127.0.0.1:%PORT%" >nul 2>&1
if not errorlevel 1 (
  echo [INFO] RuangTenang sudah aktif di http://127.0.0.1:%PORT%
  echo [INFO] Membuka jendela aplikasi RuangTenang...
  goto launch_app
)

rem --- Pastikan bundle produksi sudah siap ---
if not exist "dist\server.mjs" (
  echo [INFO] Menyiapkan build produksi optimal...
  call npm run build
)

rem --- Pastikan Ollama lokal aktif ---
curl.exe -f -s -m 1 "http://127.0.0.1:11434/api/tags" >nul 2>&1
if errorlevel 1 (
  echo [INFO] Mengaktifkan daemon Ollama AI lokal...
  where ollama >nul 2>&1
  if not errorlevel 1 (
    start "" /min ollama serve
  ) else (
    if exist "%LOCALAPPDATA%\Programs\Ollama\ollama.exe" (
      start "" /min "%LOCALAPPDATA%\Programs\Ollama\ollama.exe" serve
    )
  )
)

rem --- Menyalakan Server RuangTenang (Super Cepat & Hemat RAM) ---
echo [INFO] Menyalakan server RuangTenang di port %PORT%...
set "NODE_OPTIONS=--max-old-space-size=512"
set "SERVE_STATIC=true"
start "RuangTenang Server" /min cmd.exe /k "node dist/server.mjs"

rem --- Polling Cepat hingga server siap merespons ---
set "READY=0"
for /l %%I in (1,1,30) do (
  curl.exe -f -s -m 1 "http://127.0.0.1:%PORT%" >nul 2>&1
  if not errorlevel 1 (
    set "READY=1"
    goto server_ready
  )
  ping -n 2 127.0.0.1 >nul 2>&1
)

:server_ready
echo [OK] RuangTenang siap! Membuka jendela aplikasi...

:launch_app
rem Membuka RuangTenang dalam mode aplikasi mandiri (tanpa tab, tanpa URL bar)
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
  start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" --app="http://127.0.0.1:%PORT%"
  exit /b 0
)
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
  start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --app="http://127.0.0.1:%PORT%"
  exit /b 0
)
if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
  start "" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" --app="http://127.0.0.1:%PORT%"
  exit /b 0
)
if exist "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" (
  start "" "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" --app="http://127.0.0.1:%PORT%"
  exit /b 0
)

rem Fallback jika Chromium engine tidak ditemukan di path standar
start "" "http://127.0.0.1:%PORT%"
exit /b 0

@echo off
setlocal
cd /d "%~dp0"
title Setup Si Tangguh (Mistral NeMo 12B - Supreme Balanced Workhorse)

echo =======================================================
echo   Mempersiapkan Model "Si Tangguh" (Mistral NeMo 12B)
echo   RuangTenang & RuangCoder Balanced Workhorse v3.0
echo =======================================================
echo.

where ollama >nul 2>&1
if errorlevel 1 (
  if exist "%LOCALAPPDATA%\Programs\Ollama\ollama.exe" (
    set "PATH=%LOCALAPPDATA%\Programs\Ollama;%PATH%"
  ) else (
    echo [ERROR] Ollama tidak ditemukan di PATH maupun AppData.
    echo Silakan pastikan Ollama terinstal dari https://ollama.com
    pause
    exit /b 1
  )
)

echo [1/3] Memastikan Ollama daemon aktif...
curl.exe -f -s -m 2 "http://127.0.0.1:11434/api/tags" >nul 2>&1
if errorlevel 1 (
  echo Mengaktifkan Ollama serve di latar belakang...
  start "" /min ollama serve
  timeout /t 3 /nobreak >nul
)

echo [2/3] Memastikan base model mistral-nemo:12b tersedia...
ollama list | findstr /i "mistral-nemo:12b" >nul 2>&1
if errorlevel 1 (
  echo Mengunduh base model mistral-nemo:12b...
  ollama pull mistral-nemo:12b
  if errorlevel 1 (
    echo [ERROR] Gagal mengunduh mistral-nemo:12b. Periksa koneksi internet Anda.
    pause
    exit /b 1
  )
) else (
  echo Base model mistral-nemo:12b sudah tersedia di lokal.
)

echo.
echo [3/3] Membangun model si-tangguh dari Modelfile.tangguh...
ollama create si-tangguh -f Modelfile.tangguh
if errorlevel 1 (
  echo [ERROR] Gagal membuat model si-tangguh.
  pause
  exit /b 1
)

echo.
echo =======================================================
echo   [BERHASIL] Si Tangguh v3.0 siap digunakan di RuangTenang!
echo   Spesifikasi: 12B Mistral NeMo, Konteks 8K, 10-Core CPU Pinned
echo =======================================================
echo.
pause

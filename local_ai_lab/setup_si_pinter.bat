@echo off
setlocal
cd /d "%~dp0"
title Setup Si Pinter (Qwen 3 1.7B - Supreme Local Genius v3.5)

echo =======================================================
echo   Mempersiapkan Model "Si Pinter" (Qwen 3 1.7B)
echo   RuangTenang & RuangKerja Local Genius v3.5
echo   Spesifikasi: 8K Context, Min-P 0.05, Few-Shot Reasoning
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

echo [2/3] Mengunduh base model qwen3:1.7b...
ollama pull qwen3:1.7b
if errorlevel 1 (
  echo [ERROR] Gagal mengunduh qwen3:1.7b. Periksa koneksi internet Anda.
  pause
  exit /b 1
)

echo.
echo [3/3] Membangun model si-pinter dari Modelfile.pinter (v3.5)...
ollama create si-pinter -f Modelfile.pinter
if errorlevel 1 (
  echo [WARNING] Mencoba fallback dengan Modelfile.asisten...
  ollama create si-pinter -f Modelfile.asisten
  if errorlevel 1 (
    echo [ERROR] Gagal membuat model si-pinter.
    pause
    exit /b 1
  )
)

echo.
echo =======================================================
echo   [BERHASIL] Si Pinter v3.5 siap digunakan di RuangTenang!
echo   Spesifikasi: 1.7B Qwen 3, Konteks 8K, Dual-Core Adaptive
echo   Jalankan: npm run check:si-pinter untuk diagnostik
echo =======================================================
echo.
pause

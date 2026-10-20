@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js belum terpasang. Install Node.js 22.12 atau lebih baru, lalu coba lagi.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo Dependensi proyek belum terpasang.
  echo Jalankan npm ci dari folder proyek terlebih dahulu.
  pause
  exit /b 1
)

set "PROJECT_DIR=%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$port = 3000; if (Test-Path '.env') { $portLine = Get-Content '.env' | Where-Object { $_ -match '^\s*PORT\s*=' } | Select-Object -First 1; if ($portLine -match '^\s*PORT\s*=\s*(\d+)') { $port = [int]$Matches[1] } }; $url = 'http://127.0.0.1:{0}' -f $port; $ready = $false; try { $response = Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 2; $ready = ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) } catch {}; if (-not $ready) { Write-Host 'Menyalakan RuangTenang. Tunggu sebentar...'; Start-Process -FilePath 'cmd.exe' -ArgumentList '/k npm run dev' -WorkingDirectory $env:PROJECT_DIR; for ($i = 0; $i -lt 90; $i++) { try { $response = Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 2; if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) { $ready = $true; break } } catch {}; Start-Sleep -Seconds 1 } }; if ($ready) { Write-Host 'RuangTenang siap. Membuka browser...'; Start-Process $url } else { Write-Host 'RuangTenang belum berhasil menyala. Baca pesan error pada jendela server.'; pause }"

endlocal

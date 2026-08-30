@echo off
set REACT_NATIVE_PACKAGER_HOSTNAME=192.168.100.116
cd /d "%~dp0"
echo.
echo ============================================
echo  Expo Go WiFi - IP: %REACT_NATIVE_PACKAGER_HOSTNAME%:8081
echo  Scanne le QR code avec Expo Go sur ton tel
echo ============================================
echo.
npx expo start --clear

@echo off
chcp 65001 >nul
title POS Pointe de Vente

echo.
echo  ╔═══════════════════════════════════════╗
echo  ║   POS Pointe de Vente - Demarrage     ║
echo  ╚═══════════════════════════════════════╝
echo.

:: Detect project directory (where this .bat file is located)
set "PROJECT_DIR=%~dp0"

:: Check if Laragon is installed
if exist "C:\laragon\laragon.exe" (
    echo [1/4] Demarrage de Laragon MySQL...
    start "" "C:\laragon\laragon.exe" --minimized
    timeout /t 5 /nobreak >nul
) else (
    echo [!] Laragon non trouve. Verifiez que MySQL est demarre manuellement.
    echo     Telechargez Laragon sur: https://laragon.org/download/
    pause
)

:: Check if .env.local exists
if not exist "%PROJECT_DIR%back\.env.local" (
    echo [!] Configuration manquante. Creation de .env.local...
    echo DATABASE_URL="mysql://root:@127.0.0.1:3306/polymer?serverVersion=mariadb-10.6.0"> "%PROJECT_DIR%back\.env.local"
    echo     Fichier .env.local cree avec la config par defaut.
)

echo [2/4] Demarrage du Backend API sur port 8000...
start "POS-Backend" cmd /k "cd /d "%PROJECT_DIR%back" && php -S localhost:8000 -t public"

timeout /t 3 /nobreak >nul

echo [3/4] Demarrage du Frontend sur port 3000...
start "POS-Frontend" cmd /k "cd /d "%PROJECT_DIR%front" && npm start"

timeout /t 12 /nobreak >nul

echo [4/4] Ouverture du navigateur...
start http://localhost:3000

echo.
echo  ╔═══════════════════════════════════════╗
echo  ║   POS demarre avec succes !           ║
echo  ║                                       ║
echo  ║   POS:   http://localhost:3000        ║
echo  ║   API:   http://localhost:8000/api    ║
echo  ║                                       ║
echo  ║   NE FERMEZ PAS les fenetres noires.  ║
echo  ╚═══════════════════════════════════════╝
echo.
pause

@echo off
chcp 65001 >nul
title POS Pointe de Vente - Installation

echo.
echo  ╔═══════════════════════════════════════════╗
echo  ║   POS Pointe de Vente - Installation      ║
echo  ║   Premiere configuration                  ║
echo  ╚═══════════════════════════════════════════╝
echo.

set "PROJECT_DIR=%~dp0"

:: --- Pre-requisites check ---
echo === Verification des prerequis ===
echo.

where php >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERREUR] PHP non trouve !
    echo          Installez Laragon: https://laragon.org/download/
    echo          Ou installez PHP: https://windows.php.net/download/
    pause
    exit /b 1
)
echo [OK] PHP trouve
php -v | findstr /R "^PHP"

where composer >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERREUR] Composer non trouve !
    echo          Installez Composer: https://getcomposer.org/download/
    pause
    exit /b 1
)
echo [OK] Composer trouve

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERREUR] Node.js non trouve !
    echo          Installez Node.js LTS: https://nodejs.org
    pause
    exit /b 1
)
echo [OK] Node.js trouve
node -v

where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERREUR] npm non trouve !
    pause
    exit /b 1
)
echo [OK] npm trouve
echo.

:: --- Backend setup ---
echo === Configuration du Backend ===
echo.

cd /d "%PROJECT_DIR%back"

if not exist ".env.local" (
    echo Creation de .env.local...
    :: Detect MySQL vs MariaDB
    mysql --version 2>nul | findstr /i "mariadb" >nul 2>&1
    if %errorlevel% equ 0 (
        echo DATABASE_URL="mysql://root:@127.0.0.1:3306/polymer?serverVersion=mariadb-10.6.0"> .env.local
    ) else (
        echo DATABASE_URL="mysql://root:@127.0.0.1:3306/polymer?serverVersion=8.0"> .env.local
    )
    echo [OK] .env.local cree
) else (
    echo [OK] .env.local existe deja
)

echo.
echo Installation des dependances PHP...
call composer install --no-interaction 2>nul
if %errorlevel% neq 0 (
    echo [INFO] composer install incompatible, mise a jour des dependances...
    call composer update --no-interaction --no-audit
)

:: Verify vendor folder exists (real success check)
if not exist "vendor\autoload.php" (
    echo [ERREUR] Les dependances PHP n'ont pas ete installees correctement.
    pause
    exit /b 1
)
echo [OK] Dependances PHP installees

echo.
echo Generation des cles JWT...
if not exist "config\jwt\private.pem" (
    php bin/console lexik:jwt:generate-keypair
    echo [OK] Cles JWT generees
) else (
    echo [OK] Cles JWT existent deja
)

echo.
echo Creation de la base de donnees...
php bin/console doctrine:database:create --if-not-exists
echo [OK] Base de donnees prete

echo.
echo Creation des tables...
php bin/console doctrine:schema:update --force --complete
php bin/console doctrine:migrations:version --add --all --no-interaction 2>nul
echo [OK] Tables creees

echo.
echo Vider le cache...
php bin/console cache:clear
echo [OK] Cache nettoye

:: --- Frontend setup ---
echo.
echo === Configuration du Frontend ===
echo.

cd /d "%PROJECT_DIR%front"

echo Installation des dependances Node (npm install)...
call npm install --legacy-peer-deps
if %errorlevel% neq 0 (
    echo [ERREUR] npm install a echoue
    pause
    exit /b 1
)
echo [OK] Dependances Node installees

echo.
echo Construction du frontend (npm run build)...
call npm run build
echo [OK] Frontend construit

:: --- Done ---
echo.
echo  ╔═══════════════════════════════════════════╗
echo  ║   Installation terminee avec succes !     ║
echo  ║                                           ║
echo  ║   Pour demarrer le POS :                  ║
echo  ║   Double-cliquez sur  demarrer-pos.bat    ║
echo  ║                                           ║
echo  ║   Premiere connexion :                    ║
echo  ║   L'app affichera un formulaire           ║
echo  ║   Code activation : MCSPVD               ║
echo  ╚═══════════════════════════════════════════╝
echo.
pause

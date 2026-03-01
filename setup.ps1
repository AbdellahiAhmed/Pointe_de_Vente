# ============================================================
# POS Pointe de Vente - Script d'installation Docker (Windows)
# ============================================================
# Prerequis: Docker Desktop installe et demarre
# Usage: PowerShell -ExecutionPolicy Bypass -File setup.ps1
#    ou: clic droit > "Executer avec PowerShell"
# ============================================================

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  POS Pointe de Vente - Installation"        -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check Docker
Write-Host "[1/7] Verification de Docker..." -ForegroundColor Yellow
try {
    docker info 2>$null | Out-Null
} catch {
    Write-Host "ERREUR: Docker n'est pas installe ou pas demarre." -ForegroundColor Red
    Write-Host "Telechargez Docker Desktop: https://www.docker.com/products/docker-desktop/"
    exit 1
}
Write-Host "  OK" -ForegroundColor Green

# 2. Create .env.local for Docker
Write-Host "[2/7] Configuration backend..." -ForegroundColor Yellow
if (-not (Test-Path "back\.env.local")) {
    @"
APP_ENV=dev
APP_DEBUG=1
DATABASE_URL="mysql://root:root@db:3306/polymer?serverVersion=mariadb-10.6.0&charset=utf8mb4"
"@ | Out-File -FilePath "back\.env.local" -Encoding utf8NoBOM
    Write-Host "  back\.env.local cree" -ForegroundColor Green
} else {
    Write-Host "  back\.env.local existe deja" -ForegroundColor Green
}

# 3. Build and start containers
Write-Host "[3/7] Construction des containers Docker..." -ForegroundColor Yellow
Push-Location back
docker compose down --remove-orphans 2>$null
docker compose build --quiet
docker compose up -d
Write-Host "  3 containers demarres (nginx, php, mariadb)" -ForegroundColor Green

# 4. Wait for MariaDB
Write-Host "[4/7] Attente de MariaDB..." -ForegroundColor Yellow
$ready = $false
for ($i = 0; $i -lt 30; $i++) {
    try {
        docker compose exec -T db mariadb --user=root --password=root -e "SELECT 1" 2>$null | Out-Null
        $ready = $true
        break
    } catch {
        Start-Sleep -Seconds 1
    }
}
if (-not $ready) {
    Write-Host "ERREUR: MariaDB n'a pas demarre apres 30 secondes." -ForegroundColor Red
    Pop-Location
    exit 1
}
Write-Host "  OK" -ForegroundColor Green

# 5. Install dependencies
Write-Host "[5/7] Installation des dependances PHP..." -ForegroundColor Yellow
docker compose exec -T php bash -c "cd /var/www/html/polymer && composer install --no-interaction --no-scripts 2>&1"
Write-Host "  OK" -ForegroundColor Green

# 6. Create database schema
Write-Host "[6/7] Creation de la base de donnees (toutes les tables)..." -ForegroundColor Yellow
docker compose exec -T php bash -c "cd /var/www/html/polymer && php -d memory_limit=512M bin/console doctrine:database:drop --force --if-exists 2>&1"
docker compose exec -T php bash -c "cd /var/www/html/polymer && php -d memory_limit=512M bin/console doctrine:database:create 2>&1"
docker compose exec -T php bash -c "cd /var/www/html/polymer && php -d memory_limit=512M bin/console doctrine:schema:update --force --complete 2>&1"
docker compose exec -T php bash -c "cd /var/www/html/polymer && php -d memory_limit=512M bin/console doctrine:migrations:sync-metadata-storage 2>&1"
docker compose exec -T php bash -c "cd /var/www/html/polymer && php -d memory_limit=512M bin/console doctrine:migrations:version --add --all --no-interaction 2>&1"

# Create refresh_tokens table
docker compose exec -T db mariadb --user=root --password=root polymer -e "CREATE TABLE IF NOT EXISTS refresh_tokens (id INT AUTO_INCREMENT NOT NULL, refresh_token VARCHAR(128) NOT NULL, username VARCHAR(255) NOT NULL, valid DATETIME NOT NULL, UNIQUE INDEX UNIQ_9BACE7E1C74F2195 (refresh_token), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE = InnoDB;" 2>$null
Write-Host "  OK - Toutes les tables creees" -ForegroundColor Green

# 7. Generate JWT keys + clear cache
Write-Host "[7/7] Generation des cles JWT..." -ForegroundColor Yellow
docker compose exec -T php bash -c "cd /var/www/html/polymer && php -d memory_limit=512M bin/console lexik:jwt:generate-keypair --overwrite 2>&1"
docker compose exec -T php bash -c "cd /var/www/html/polymer && php -d memory_limit=512M bin/console cache:clear 2>&1"
Write-Host "  OK" -ForegroundColor Green

Pop-Location

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  Installation terminee !"                    -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Backend API:  http://localhost:8000/api"
Write-Host "  API Doc:      http://localhost:8000/api/doc"
Write-Host "  MariaDB:      localhost:3307 (root/root)"
Write-Host ""
Write-Host "  Pour lancer le frontend:"
Write-Host "    cd front"
Write-Host "    npm install"
Write-Host "    npm run dev"
Write-Host "    => http://localhost:3000"
Write-Host ""
Write-Host "  Premier acces: l'application demandera l'activation."
Write-Host "  Code d'activation: MCSPVD"
Write-Host "  Login admin: admin / mcs123"
Write-Host ""

#!/bin/bash
# ============================================================
# POS Pointe de Vente - Script d'installation Docker
# ============================================================
# Prérequis: Docker Desktop installé et démarré
# Usage: bash setup.sh
# ============================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo "============================================"
echo "  POS Pointe de Vente - Installation"
echo "============================================"
echo ""

# 1. Check Docker
echo -e "${YELLOW}[1/7]${NC} Vérification de Docker..."
if ! command -v docker &> /dev/null; then
    echo -e "${RED}ERREUR: Docker n'est pas installé.${NC}"
    echo "Téléchargez Docker Desktop: https://www.docker.com/products/docker-desktop/"
    exit 1
fi
if ! docker info &> /dev/null 2>&1; then
    echo -e "${RED}ERREUR: Docker n'est pas démarré. Lancez Docker Desktop.${NC}"
    exit 1
fi
echo -e "${GREEN}  OK${NC}"

# 2. Create .env.local for Docker
echo -e "${YELLOW}[2/7]${NC} Configuration backend..."
if [ ! -f back/.env.local ]; then
    cat > back/.env.local << 'ENVEOF'
APP_ENV=dev
APP_DEBUG=1
DATABASE_URL="mysql://root:root@db:3306/polymer?serverVersion=mariadb-10.6.0&charset=utf8mb4"
ENVEOF
    echo -e "${GREEN}  back/.env.local créé${NC}"
else
    echo -e "${GREEN}  back/.env.local existe déjà${NC}"
fi

# 3. Build and start containers
echo -e "${YELLOW}[3/7]${NC} Construction des containers Docker..."
cd back
docker compose down --remove-orphans 2>/dev/null || true
docker compose build --quiet
docker compose up -d
echo -e "${GREEN}  3 containers démarrés (nginx, php, mariadb)${NC}"

# 4. Wait for MariaDB
echo -e "${YELLOW}[4/7]${NC} Attente de MariaDB..."
for i in {1..30}; do
    if docker compose exec -T db mariadb --user=root --password=root -e "SELECT 1" &>/dev/null; then
        break
    fi
    sleep 1
done
echo -e "${GREEN}  OK${NC}"

# 5. Install dependencies + create schema
echo -e "${YELLOW}[5/7]${NC} Installation des dépendances PHP..."
docker compose exec -T php bash -c "cd /var/www/html/polymer && composer install --no-interaction --no-scripts 2>&1" | tail -1
echo -e "${GREEN}  OK${NC}"

echo -e "${YELLOW}[6/7]${NC} Création de la base de données..."
docker compose exec -T php bash -c "cd /var/www/html/polymer && \
    php -d memory_limit=512M bin/console doctrine:database:drop --force --if-exists 2>&1 && \
    php -d memory_limit=512M bin/console doctrine:database:create 2>&1 && \
    php -d memory_limit=512M bin/console doctrine:schema:update --force --complete 2>&1 && \
    php -d memory_limit=512M bin/console doctrine:migrations:sync-metadata-storage 2>&1 && \
    php -d memory_limit=512M bin/console doctrine:migrations:version --add --all --no-interaction 2>&1" | tail -1

# Create refresh_tokens table (gesdinet bundle)
docker compose exec -T db mariadb --user=root --password=root polymer -e "
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id INT AUTO_INCREMENT NOT NULL,
    refresh_token VARCHAR(128) NOT NULL,
    username VARCHAR(255) NOT NULL,
    valid DATETIME NOT NULL,
    UNIQUE INDEX UNIQ_9BACE7E1C74F2195 (refresh_token),
    PRIMARY KEY(id)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE = InnoDB;
" 2>/dev/null
echo -e "${GREEN}  OK - Toutes les tables créées${NC}"

# 7. Generate JWT keys + clear cache
echo -e "${YELLOW}[7/7]${NC} Génération des clés JWT..."
docker compose exec -T php bash -c "cd /var/www/html/polymer && \
    php -d memory_limit=512M bin/console lexik:jwt:generate-keypair --overwrite 2>&1 && \
    php -d memory_limit=512M bin/console cache:clear 2>&1" | tail -1
echo -e "${GREEN}  OK${NC}"

cd ..

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  Installation terminée !${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "  Backend API:  http://localhost:8000/api"
echo "  API Doc:      http://localhost:8000/api/doc"
echo "  MariaDB:      localhost:3307 (root/root)"
echo ""
echo "  Pour lancer le frontend:"
echo "    cd front && npm install && npm run dev"
echo "    => http://localhost:3000"
echo ""
echo "  Premier accès: l'application demandera l'activation."
echo "  Code d'activation: MCSPVD"
echo "  Login admin: admin / mcs123"
echo ""
echo "  Commandes utiles:"
echo "    docker compose -f back/docker-compose.yaml up -d    # Démarrer"
echo "    docker compose -f back/docker-compose.yaml down      # Arrêter"
echo "    docker compose -f back/docker-compose.yaml logs -f   # Voir les logs"
echo ""

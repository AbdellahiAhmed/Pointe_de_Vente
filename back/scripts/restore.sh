#!/bin/bash
# =====================================================================
# POS Restore Script
# Restores MariaDB database from a backup dump
# Usage: ./restore.sh <backup_file.sql.gz>
# =====================================================================

set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <backup_file.sql.gz>"
  echo "Example: $0 /srv/backups/pos/db_2026-02-28_020000.sql.gz"
  exit 1
fi

BACKUP_FILE="$1"
CONTAINER_NAME="pos-db"  # Adjust if different

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "Error: Backup file not found: ${BACKUP_FILE}"
  exit 1
fi

echo "WARNING: This will overwrite the current database!"
echo "Backup file: ${BACKUP_FILE}"
echo "Press ENTER to continue or Ctrl+C to cancel..."
read -r

echo "[$(date)] Starting database restore..."

# Restore database
gunzip -c "${BACKUP_FILE}" | docker exec -i "${CONTAINER_NAME}" sh -c 'exec mariadb -u root -p"${MARIADB_ROOT_PASSWORD}" pos_db'

echo "[$(date)] Database restore complete."
echo "[$(date)] Run 'docker exec pos-php php bin/console doctrine:migrations:migrate --no-interaction' to apply any pending migrations."

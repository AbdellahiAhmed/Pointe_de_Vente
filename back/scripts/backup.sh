#!/bin/bash
# =====================================================================
# POS Backup Script
# Backs up MariaDB database and uploaded files
# Usage: ./backup.sh [backup_dir]
# Recommended: Run daily via cron
#   0 2 * * * /path/to/backup.sh >> /var/log/pos-backup.log 2>&1
# =====================================================================

set -euo pipefail

BACKUP_DIR="${1:-/srv/backups/pos}"
RETENTION_DAYS=7
DATE=$(date +%Y-%m-%d_%H%M%S)
CONTAINER_NAME="pos-db"  # Adjust if different

# Create backup directory
mkdir -p "${BACKUP_DIR}"

echo "[$(date)] Starting POS backup..."

# Database dump
DB_BACKUP="${BACKUP_DIR}/db_${DATE}.sql.gz"
docker exec "${CONTAINER_NAME}" sh -c 'exec mariadb-dump -u root -p"${MARIADB_ROOT_PASSWORD}" --single-transaction --routines --triggers pos_db' | gzip > "${DB_BACKUP}"
echo "[$(date)] Database backup: ${DB_BACKUP} ($(du -sh "${DB_BACKUP}" | cut -f1))"

# Uploads backup
UPLOADS_BACKUP="${BACKUP_DIR}/uploads_${DATE}.tar.gz"
docker cp "${CONTAINER_NAME}:/srv/app/public/uploads" - | gzip > "${UPLOADS_BACKUP}" 2>/dev/null || \
  tar -czf "${UPLOADS_BACKUP}" -C "$(dirname "$0")/../public" uploads 2>/dev/null || \
  echo "[$(date)] Warning: Could not backup uploads"

if [ -f "${UPLOADS_BACKUP}" ]; then
  echo "[$(date)] Uploads backup: ${UPLOADS_BACKUP} ($(du -sh "${UPLOADS_BACKUP}" | cut -f1))"
fi

# Cleanup old backups
echo "[$(date)] Cleaning up backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "db_*.sql.gz" -mtime +${RETENTION_DAYS} -delete 2>/dev/null || true
find "${BACKUP_DIR}" -name "uploads_*.tar.gz" -mtime +${RETENTION_DAYS} -delete 2>/dev/null || true

# Summary
REMAINING=$(ls -1 "${BACKUP_DIR}"/db_*.sql.gz 2>/dev/null | wc -l)
echo "[$(date)] Backup complete. ${REMAINING} database backups retained."
echo "[$(date)] Total backup size: $(du -sh "${BACKUP_DIR}" | cut -f1)"

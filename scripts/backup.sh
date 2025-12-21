#!/bin/bash

# MongoDB Backup Script
# Runs daily via cron or docker-compose

set -e

# Configuration
MONGO_HOST="${MONGO_HOST:-mongodb}"
MONGO_PORT="${MONGO_PORT:-27017}"
MONGO_USERNAME="${MONGO_USERNAME:-admin}"
MONGO_PASSWORD="${MONGO_PASSWORD}"
MONGO_DATABASE="${MONGO_DATABASE:-stock_count}"
BACKUP_DIR="/backups"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

# Generate backup filename with timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="stock_count_backup_${TIMESTAMP}"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"

echo "Starting MongoDB backup: ${BACKUP_NAME}"

# Perform mongodump
if [ -n "$MONGO_PASSWORD" ]; then
    mongodump \
        --host="${MONGO_HOST}" \
        --port="${MONGO_PORT}" \
        --username="${MONGO_USERNAME}" \
        --password="${MONGO_PASSWORD}" \
        --authenticationDatabase=admin \
        --db="${MONGO_DATABASE}" \
        --out="${BACKUP_PATH}" \
        --gzip
else
    mongodump \
        --host="${MONGO_HOST}" \
        --port="${MONGO_PORT}" \
        --db="${MONGO_DATABASE}" \
        --out="${BACKUP_PATH}" \
        --gzip
fi

# Check if backup was successful
if [ $? -eq 0 ]; then
    echo "Backup completed successfully: ${BACKUP_PATH}"

    # Create a compressed archive
    cd "${BACKUP_DIR}"
    tar -czf "${BACKUP_NAME}.tar.gz" "${BACKUP_NAME}"

    # Remove uncompressed backup
    rm -rf "${BACKUP_NAME}"

    echo "Backup compressed: ${BACKUP_NAME}.tar.gz"
else
    echo "Backup failed!"
    exit 1
fi

# Remove old backups (older than RETENTION_DAYS)
echo "Removing backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "stock_count_backup_*.tar.gz" -type f -mtime +${RETENTION_DAYS} -delete

# List recent backups
echo "Recent backups:"
ls -lh "${BACKUP_DIR}" | grep "stock_count_backup_" | tail -10

echo "Backup process completed"

# Optional: Upload to S3 or cloud storage
# if [ -n "${BACKUP_S3_BUCKET}" ]; then
#     echo "Uploading to S3: ${BACKUP_S3_BUCKET}"
#     aws s3 cp "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" "s3://${BACKUP_S3_BUCKET}/backups/"
# fi

# Keep script running if used with cron schedule
if [ -n "${BACKUP_CRON_SCHEDULE}" ]; then
    echo "Setting up cron schedule: ${BACKUP_CRON_SCHEDULE}"
    echo "${BACKUP_CRON_SCHEDULE} /backup.sh >> /var/log/backup.log 2>&1" | crontab -
    cron -f
fi

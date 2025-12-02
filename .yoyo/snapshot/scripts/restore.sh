#!/bin/bash

# MongoDB Restore Script
# Usage: ./restore.sh <backup_file.tar.gz>

set -e

if [ $# -eq 0 ]; then
    echo "Usage: $0 <backup_file.tar.gz>"
    echo "Example: $0 /backups/stock_count_backup_20250107_020000.tar.gz"
    exit 1
fi

BACKUP_FILE=$1

if [ ! -f "${BACKUP_FILE}" ]; then
    echo "Error: Backup file not found: ${BACKUP_FILE}"
    exit 1
fi

# Configuration
MONGO_HOST="${MONGO_HOST:-mongodb}"
MONGO_PORT="${MONGO_PORT:-27017}"
MONGO_USERNAME="${MONGO_USERNAME:-admin}"
MONGO_PASSWORD="${MONGO_PASSWORD}"
MONGO_DATABASE="${MONGO_DATABASE:-stock_count}"
RESTORE_DIR="/tmp/restore_$(date +%s)"

echo "Starting MongoDB restore from: ${BACKUP_FILE}"
echo "⚠️  WARNING: This will drop the existing database!"
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Restore cancelled"
    exit 0
fi

# Create temporary restore directory
mkdir -p "${RESTORE_DIR}"

# Extract backup
echo "Extracting backup..."
tar -xzf "${BACKUP_FILE}" -C "${RESTORE_DIR}"

# Find the database directory
DB_DIR=$(find "${RESTORE_DIR}" -type d -name "${MONGO_DATABASE}")

if [ -z "${DB_DIR}" ]; then
    echo "Error: Database directory not found in backup"
    rm -rf "${RESTORE_DIR}"
    exit 1
fi

# Perform mongorestore with drop
echo "Restoring database..."
mongorestore \
    --host="${MONGO_HOST}" \
    --port="${MONGO_PORT}" \
    --username="${MONGO_USERNAME}" \
    --password="${MONGO_PASSWORD}" \
    --authenticationDatabase=admin \
    --db="${MONGO_DATABASE}" \
    --drop \
    --gzip \
    "${DB_DIR}"

# Check if restore was successful
if [ $? -eq 0 ]; then
    echo "✅ Restore completed successfully"
else
    echo "❌ Restore failed!"
    exit 1
fi

# Cleanup
rm -rf "${RESTORE_DIR}"

echo "Restore process completed"

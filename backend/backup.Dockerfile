FROM mongo:8.0

# Install cron
RUN apt-get update && apt-get install -y cron && rm -rf /var/lib/apt/lists/*

# Copy backup script
COPY scripts/backup.sh /backup.sh
RUN chmod +x /backup.sh

# Create backups directory
RUN mkdir -p /backups

# Set entrypoint
ENTRYPOINT ["/backup.sh"]

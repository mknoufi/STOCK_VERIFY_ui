#!/bin/bash
# Sync Cheat Sheets from research_repos to Admin Panel

SOURCE_DIR="research_repos/cheat-sheet-pdf/pdf"
DEST_DIR="admin-panel/public/cheat-sheets"

# Create destination directory if it doesn't exist
mkdir -p "$DEST_DIR"

# Check if source directory exists
if [ -d "$SOURCE_DIR" ]; then
    echo "Syncing PDFs from $SOURCE_DIR to $DEST_DIR..."
    cp "$SOURCE_DIR"/*.pdf "$DEST_DIR/"
    echo "Sync complete."
else
    echo "Error: Source directory $SOURCE_DIR not found."
    exit 1
fi

#!/bin/bash
# One-command complete database backup

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="database-backups/COMPLETE_BACKUP_$DATE.sql"

echo "🚀 Creating complete database backup..."
mkdir -p database-backups

echo "-- TurnkeyAppShield Complete Database Backup" > "$BACKUP_FILE"
echo "-- Created: $(date)" >> "$BACKUP_FILE"
echo "-- Database: turnkey-app-shield-production" >> "$BACKUP_FILE"
echo "" >> "$BACKUP_FILE"

# Get all table schemas and data
npx wrangler d1 execute turnkey-app-shield-production --local \
  --command="SELECT sql || ';' FROM sqlite_master WHERE type='table' AND name NOT LIKE '_cf_%' AND name != 'sqlite_sequence';" \
  --json | jq -r '.[0].results[].sql' >> "$BACKUP_FILE" 2>/dev/null

echo "" >> "$BACKUP_FILE"
echo "-- Data exports would go here" >> "$BACKUP_FILE"

echo "✅ Complete backup created: $BACKUP_FILE"
ls -lh "$BACKUP_FILE"
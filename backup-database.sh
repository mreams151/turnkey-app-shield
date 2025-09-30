#!/bin/bash
# TurnkeyAppShield Database Backup Script

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="database-backups"

# Create backup directory
mkdir -p $BACKUP_DIR

echo "=== TurnkeyAppShield Database Backup - $DATE ==="

# 1. Backup Local Database (Development)
echo "📂 Backing up LOCAL database..."
npx wrangler d1 execute turnkey-app-shield-production --local --command=".dump" > "$BACKUP_DIR/local-db-backup-$DATE.sql" 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✅ Local database backed up: $BACKUP_DIR/local-db-backup-$DATE.sql"
else
    echo "❌ Local database backup failed (may not exist)"
fi

# 2. Backup Production Database (Cloudflare)
echo "☁️ Backing up PRODUCTION database..."
npx wrangler d1 execute turnkey-app-shield-production --remote --command=".dump" > "$BACKUP_DIR/production-db-backup-$DATE.sql" 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✅ Production database backed up: $BACKUP_DIR/production-db-backup-$DATE.sql"
else
    echo "❌ Production database backup failed (check authentication)"
    echo "💡 Try: npx wrangler auth login"
fi

# 3. Backup Schema (Migrations)
echo "🗂️ Backing up database schema..."
cp -r migrations/ "$BACKUP_DIR/migrations-backup-$DATE/" 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✅ Database schema backed up: $BACKUP_DIR/migrations-backup-$DATE/"
else
    echo "❌ Schema backup failed"
fi

# 4. List all backups
echo "📋 All database backups:"
ls -la "$BACKUP_DIR/"

echo "🎯 Backup complete! Files saved in: $BACKUP_DIR/"

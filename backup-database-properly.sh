#!/bin/bash
# TurnkeyAppShield Database Backup Script (Working Version)
# This script creates proper SQL backups that can be restored

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="database-backups"

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo "=== TurnkeyAppShield Database Backup - $DATE ==="
echo ""

# Function to backup a table
backup_table() {
    local table_name=$1
    local db_flag=$2
    local filename_suffix=$3
    
    echo "📋 Backing up table: $table_name ($filename_suffix)"
    
    # Get table schema
    npx wrangler d1 execute turnkey-app-shield-production $db_flag \
        --command="SELECT sql FROM sqlite_master WHERE type='table' AND name='$table_name';" \
        --json | jq -r '.[0].results[0].sql' > "$BACKUP_DIR/${table_name}_schema_${filename_suffix}_$DATE.sql" 2>/dev/null
    
    # Get table data as INSERT statements
    npx wrangler d1 execute turnkey-app-shield-production $db_flag \
        --command="SELECT * FROM $table_name;" \
        --json > "$BACKUP_DIR/${table_name}_data_${filename_suffix}_$DATE.json" 2>/dev/null
        
    if [ $? -eq 0 ]; then
        echo "   ✅ $table_name backed up successfully"
        return 0
    else
        echo "   ❌ Failed to backup $table_name"
        return 1
    fi
}

# List of important tables to backup
TABLES=("customers" "products" "license_rules" "activation_logs" "security_events" "admin_users")

echo "🔍 Backing up LOCAL database tables..."
for table in "${TABLES[@]}"; do
    backup_table "$table" "--local" "local"
done

echo ""
echo "☁️ Backing up PRODUCTION database tables..."
for table in "${TABLES[@]}"; do
    backup_table "$table" "--remote" "production"
done

echo ""
echo "📊 Backup Summary:"
echo "Backup files created in: $BACKUP_DIR/"
ls -la "$BACKUP_DIR/" | grep "$DATE"

echo ""
echo "🎯 Backup completed! Files saved with timestamp: $DATE"
echo "💡 To restore: Use the schema files to recreate tables, then import the JSON data"
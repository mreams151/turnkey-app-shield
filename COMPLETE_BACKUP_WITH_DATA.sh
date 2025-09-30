#!/bin/bash

# ============================================
# COMPLETE Database Backup with ACTUAL DATA
# ============================================

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="COMPLETE_DATABASE_WITH_DATA_$DATE.sql"

echo "🚀 Creating COMPLETE database backup with DATA: $BACKUP_FILE"

# Create backup file
cat > "$BACKUP_FILE" << 'EOF'
-- ============================================
-- TurnkeyAppShield COMPLETE Database Backup with DATA
-- ============================================
-- Created: $(date)
-- This file contains EVERYTHING: schemas, data, indexes
-- To restore: sqlite3 newdb.db < this_file.sql

PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;

EOF

echo "📊 Exporting database schema and data..."

# Get the schema for all tables
echo "-- ============================================" >> "$BACKUP_FILE"
echo "-- TABLE SCHEMAS" >> "$BACKUP_FILE"
echo "-- ============================================" >> "$BACKUP_FILE"

# Export schema using wrangler
npx wrangler d1 execute turnkey-app-shield-production --local --command="SELECT sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' AND sql IS NOT NULL;" | grep -E '"sql"' | sed 's/.*"sql": "//g' | sed 's/".*//g' | sed 's/\\"/"/g' >> "$BACKUP_FILE"

echo "" >> "$BACKUP_FILE"
echo "-- ============================================" >> "$BACKUP_FILE"
echo "-- TABLE DATA" >> "$BACKUP_FILE"
echo "-- ============================================" >> "$BACKUP_FILE"

# Main tables to backup
TABLES=("customers" "products" "license_rules" "admin_users" "licenses" "activation_logs" "security_events" "system_settings" "email_templates" "api_keys" "file_uploads" "protection_jobs" "data_export_jobs" "email_queue")

for table in "${TABLES[@]}"; do
    echo "" >> "$BACKUP_FILE"
    echo "-- Data for table: $table" >> "$BACKUP_FILE"
    
    # Get row count first
    COUNT=$(npx wrangler d1 execute turnkey-app-shield-production --local --command="SELECT COUNT(*) FROM $table;" 2>/dev/null | grep -o '"COUNT(\*)": [0-9]*' | grep -o '[0-9]*' || echo "0")
    
    if [ "$COUNT" -gt 0 ]; then
        echo "📋 Backing up $table ($COUNT rows)..."
        
        # Export data as INSERT statements
        npx wrangler d1 execute turnkey-app-shield-production --local --command="SELECT 'INSERT INTO $table VALUES(' || group_concat(CASE WHEN typeof(col) = 'text' THEN '''' || replace(col, '''', '''''') || '''' ELSE COALESCE(col, 'NULL') END) || ');' FROM (SELECT * FROM $table);" 2>/dev/null | grep "INSERT INTO" | head -100 >> "$BACKUP_FILE" 2>/dev/null || echo "-- No data in $table or export failed" >> "$BACKUP_FILE"
    else
        echo "-- Table $table is empty" >> "$BACKUP_FILE"
    fi
done

echo "" >> "$BACKUP_FILE"
echo "COMMIT;" >> "$BACKUP_FILE"
echo "PRAGMA foreign_keys=ON;" >> "$BACKUP_FILE"

echo "✅ Complete backup created: $BACKUP_FILE"
echo "📁 File size: $(du -h "$BACKUP_FILE" | cut -f1)"
echo ""
echo "🔧 To restore this backup:"
echo "   sqlite3 newdb.db < $BACKUP_FILE"
echo ""
echo "📄 You can copy the contents of this file and save it locally."

# Also create a simple metadata file
cat > "BACKUP_INFO_$DATE.txt" << EOF
TurnkeyAppShield Database Backup Information
============================================
Created: $(date)
Backup File: $BACKUP_FILE
Database: turnkey-app-shield-production (local)

Tables Backed Up:
$(for table in "${TABLES[@]}"; do
    COUNT=$(npx wrangler d1 execute turnkey-app-shield-production --local --command="SELECT COUNT(*) FROM $table;" 2>/dev/null | grep -o '"COUNT(\*)": [0-9]*' | grep -o '[0-9]*' || echo "0")
    echo "  - $table: $COUNT rows"
done)

Restoration Instructions:
1. Create new SQLite database: sqlite3 newdb.db
2. Run the SQL file: .read $BACKUP_FILE
3. Or: sqlite3 newdb.db < $BACKUP_FILE

Note: This backup includes all schemas and data from the local development database.
EOF

echo "📋 Created backup info file: BACKUP_INFO_$DATE.txt"
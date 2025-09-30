-- ============================================
-- CLOUDFLARE DASHBOARD COMPLETE BACKUP
-- ============================================
-- Copy and paste this ENTIRE query into Cloudflare D1 Console
-- It will show you everything needed for backup

SELECT '-- TurnkeyAppShield Complete Database Backup' as backup_line
UNION ALL SELECT '-- Created: ' || datetime('now') 
UNION ALL SELECT '-- Database: turnkey-app-shield-production'
UNION ALL SELECT ''
UNION ALL SELECT 'PRAGMA foreign_keys=OFF;'
UNION ALL SELECT ''
UNION ALL SELECT '-- TABLE SCHEMAS:'
UNION ALL SELECT sql || ';' FROM sqlite_master 
  WHERE type='table' 
  AND name NOT LIKE '_cf_%' 
  AND name != 'sqlite_sequence' 
  AND sql IS NOT NULL
UNION ALL SELECT ''
UNION ALL SELECT '-- To get DATA, run these commands separately:'
UNION ALL SELECT '-- SELECT * FROM ' || name || ';' FROM sqlite_master 
  WHERE type='table' 
  AND name NOT LIKE '_cf_%' 
  AND name != 'sqlite_sequence'
  AND name NOT LIKE 'd1_%'
ORDER BY backup_line;
-- Advanced Maintenance Mode System
-- Enhanced maintenance settings with custom messages, types, and duration

-- Add advanced maintenance mode settings
INSERT OR IGNORE INTO system_settings (category, key, value, description) VALUES 
  ('maintenance', 'maintenance_message', 'System is currently under maintenance. Please try again later.', 'Custom maintenance message shown to users'),
  ('maintenance', 'maintenance_type', 'planned', 'Maintenance type: planned|emergency|updates|migrations|custom'),
  ('maintenance', 'maintenance_duration_minutes', '60', 'Expected maintenance duration in minutes'),
  ('maintenance', 'maintenance_started_at', '', 'ISO timestamp when maintenance started'),
  ('maintenance', 'maintenance_completion_time', '', 'Expected completion time (ISO timestamp)');

-- Create maintenance_events table for history tracking
CREATE TABLE IF NOT EXISTS maintenance_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL DEFAULT 'planned',
    message TEXT NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    started_by_admin_id INTEGER,
    completed_at DATETIME,
    actual_duration_minutes INTEGER,
    status TEXT DEFAULT 'active', -- active|completed|cancelled
    FOREIGN KEY (started_by_admin_id) REFERENCES admin_users(id)
);

CREATE INDEX IF NOT EXISTS idx_maintenance_events_status ON maintenance_events(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_events_started_at ON maintenance_events(started_at);
-- Add cooldown settings for WhatsApp alerts
-- Options: 30 seconds, 1 min (60), 5 min (300), 10 min (600)

-- Add cooldown column (in seconds) - default 1 minute
ALTER TABLE alert_settings
ADD COLUMN IF NOT EXISTS alert_cooldown_seconds INTEGER DEFAULT 60;

-- Add last alert timestamp column to track when last alert was sent
ALTER TABLE alert_settings
ADD COLUMN IF NOT EXISTS last_alert_sent_at TIMESTAMPTZ DEFAULT NULL;

-- Add constraint for valid cooldown values (30s, 1min, 5min, 10min)
ALTER TABLE alert_settings
DROP CONSTRAINT IF EXISTS valid_cooldown_values;

ALTER TABLE alert_settings
ADD CONSTRAINT valid_cooldown_values
CHECK (alert_cooldown_seconds IN (30, 60, 300, 600));

COMMENT ON COLUMN alert_settings.alert_cooldown_seconds IS 'Minimum seconds between WhatsApp alerts (30, 60, 300, or 600)';
COMMENT ON COLUMN alert_settings.last_alert_sent_at IS 'Timestamp of last WhatsApp alert sent';

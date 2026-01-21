-- Fix min_confidence column type from INTEGER to NUMERIC
-- This allows storing decimal values like 0.70 instead of 70

ALTER TABLE alert_settings
ALTER COLUMN min_confidence TYPE NUMERIC(3,2) USING min_confidence::NUMERIC / 100;

-- Add a check constraint to ensure values are between 0 and 1
ALTER TABLE alert_settings
ADD CONSTRAINT min_confidence_range CHECK (min_confidence >= 0 AND min_confidence <= 1);

-- Update any existing rows that might have percentage values (like 70 instead of 0.70)
UPDATE alert_settings
SET min_confidence = min_confidence / 100
WHERE min_confidence > 1;

COMMENT ON COLUMN alert_settings.min_confidence IS 'Minimum confidence threshold (0.0 to 1.0) for triggering alerts';

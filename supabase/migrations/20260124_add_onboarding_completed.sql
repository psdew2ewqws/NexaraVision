-- Add onboarding_completed field to profiles table
-- This tracks whether a user has completed the initial onboarding wizard

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- Create index for quick filtering of users who haven't completed onboarding
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding ON profiles(onboarding_completed) WHERE onboarding_completed = false;

-- Update existing users to mark them as completed (they were using the system before onboarding existed)
UPDATE profiles SET onboarding_completed = true WHERE onboarding_completed IS NULL OR onboarding_completed = false;

COMMENT ON COLUMN profiles.onboarding_completed IS 'Whether user has completed the initial onboarding wizard';

-- Migration: Add important rules columns to user_settings
-- These replace the old system_prompt/prototype_prompt columns
ALTER TABLE user_settings ADD COLUMN public_important_rules TEXT;
ALTER TABLE user_settings ADD COLUMN dm_important_rules TEXT;
ALTER TABLE user_settings ADD COLUMN prototype_public_rules TEXT;
ALTER TABLE user_settings ADD COLUMN prototype_dm_rules TEXT;

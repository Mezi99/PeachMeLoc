-- Migration: Add important rules columns to user_settings (if not exists)
-- These replace the old system_prompt/prototype_prompt columns
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS public_important_rules TEXT;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS dm_important_rules TEXT;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS prototype_public_rules TEXT;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS prototype_dm_rules TEXT;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS public_post_instruction TEXT;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS dm_post_instruction TEXT;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS prototype_public_post_instruction TEXT;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS prototype_dm_post_instruction TEXT;

-- Migration: Add system_prompt and prototype_prompt columns to user_settings (if not exists)
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS system_prompt TEXT;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS prototype_prompt TEXT;

-- Migration: Add system_prompt and prototype_prompt columns to user_settings
ALTER TABLE user_settings ADD COLUMN system_prompt TEXT;
ALTER TABLE user_settings ADD COLUMN prototype_prompt TEXT;

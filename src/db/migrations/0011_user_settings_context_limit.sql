-- Add context_limit to user_settings for controlling prompt context size
ALTER TABLE user_settings ADD COLUMN context_limit INTEGER NOT NULL DEFAULT 20;

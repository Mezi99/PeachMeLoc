-- Add hop_counter column to user_settings for agent-to-agent loop control
ALTER TABLE user_settings ADD COLUMN hop_counter INTEGER NOT NULL DEFAULT 2;

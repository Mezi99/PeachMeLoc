-- Add isActive to channels and threads tables
-- isActive=false means the channel/thread is inactive (archived) but not deleted
-- Inactive channels/threads are excluded from AI context prompts

ALTER TABLE channels ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1;
ALTER TABLE threads ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1;

-- Create index for faster queries on active channels/threads
CREATE INDEX IF NOT EXISTS idx_channels_active ON channels(is_active);
CREATE INDEX IF NOT EXISTS idx_threads_active ON threads(is_active);

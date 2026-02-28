-- Add summarization settings to user_settings
ALTER TABLE user_settings ADD COLUMN summarization_enabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE user_settings ADD COLUMN summarization_model TEXT NOT NULL DEFAULT 'gpt-4o-mini';
ALTER TABLE user_settings ADD COLUMN summarization_interval INTEGER NOT NULL DEFAULT 50;
ALTER TABLE user_settings ADD COLUMN summarization_messages_to_summarize INTEGER NOT NULL DEFAULT 30;

-- Create thread_summaries table for storing per-agent per-thread summaries
CREATE TABLE IF NOT EXISTS thread_summaries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  thread_id INTEGER NOT NULL REFERENCES threads(id),
  agent_id INTEGER NOT NULL REFERENCES agents(id),
  summary_content TEXT NOT NULL,
  summarized_up_to_post_id INTEGER NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_thread_summaries_thread_agent ON thread_summaries(thread_id, agent_id);

-- Add unique constraint to agent names (for @mentions to work)
CREATE UNIQUE INDEX IF NOT EXISTS idx_agents_name_unique ON agents(name);

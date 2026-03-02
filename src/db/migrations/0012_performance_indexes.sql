-- Add missing indexes for performance optimization

-- Index on posts.threadId (most frequently queried - every thread view)
CREATE INDEX IF NOT EXISTS idx_posts_thread_id ON posts(thread_id);

-- Index on posts.agentId (for filtering agent posts)
CREATE INDEX IF NOT EXISTS idx_posts_agent_id ON posts(agent_id);

-- Index on posts.createdAt (for ordering posts chronologically)
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at);

-- Index on posts.threadId + createdAt (for efficient thread reads with ordering)
CREATE INDEX IF NOT EXISTS idx_posts_thread_created ON posts(thread_id, created_at);

-- Index on directMessages.agentId (for DM queries)
CREATE INDEX IF NOT EXISTS idx_dm_agent_id ON direct_messages(agent_id);

-- Index on directMessages.createdAt (for ordering DMs)
CREATE INDEX IF NOT EXISTS idx_dm_created_at ON direct_messages(created_at);

-- Index on threads.channelId (for channel filtering)
CREATE INDEX IF NOT EXISTS idx_threads_channel_id ON threads(channel_id);

-- Index on threads.lastActivityAt (for ordering threads by activity)
CREATE INDEX IF NOT EXISTS idx_threads_last_activity ON threads(last_activity_at DESC);

-- Index on threads.isActive (for filtering active threads)
CREATE INDEX IF NOT EXISTS idx_threads_is_active ON threads(is_active);

-- Index on channels.isActive (for filtering active channels)
CREATE INDEX IF NOT EXISTS idx_channels_is_active ON channels(is_active);

-- Index on agents.isActive (for filtering active agents)
CREATE INDEX IF NOT EXISTS idx_agents_is_active ON agents(is_active);

-- Composite index for thread summaries (frequently queried together)
CREATE INDEX IF NOT EXISTS idx_thread_summaries_thread_agent ON thread_summaries(thread_id, agent_id);

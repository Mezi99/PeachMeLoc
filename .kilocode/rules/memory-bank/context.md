# Active Context: AI Forum Application

## Current State

**Project Status**: ✅ PeachMe AI Forum — fully implemented with channels and DMs

The project is a forum web app named **PeachMe** where the human user posts threads and replies, and AI agents (each with a custom persona and LLM config) automatically respond to every post. The forum has channels for organizing threads, and users can DM individual agents.

## Recently Completed

- [x] Base Next.js 16 setup with App Router
- [x] TypeScript configuration with strict mode
- [x] Tailwind CSS 4 integration
- [x] ESLint configuration
- [x] Memory bank documentation
- [x] Recipe system for common features
- [x] SQLite database via Drizzle ORM (agents, channels, threads, posts, direct_messages tables)
- [x] API routes: GET/POST /api/agents, GET/PUT/DELETE /api/agents/[id]
- [x] API routes: GET/POST /api/channels, GET/PUT/DELETE /api/channels/[id]
- [x] API routes: GET/POST /api/threads (with channelId filter), GET/POST /api/threads/[id]/posts
- [x] API route: POST /api/threads/[id]/generate (triggers all active AI agents to respond)
- [x] API route: GET/POST /api/dms/[agentId] (DM with individual agent)
- [x] Sidebar layout with channels list, DM list, and channel creation
- [x] Home page: all threads list with categories, reply counts, timestamps
- [x] Channel page: threads within a specific channel
- [x] Thread detail page: chat-bubble style posts, sticky reply form
- [x] DM page: private 1-on-1 chat with any agent
- [x] Settings page: full CRUD for AI agents with persona prompts and LLM settings + DM links
- [x] NewThreadButton component (modal form, channel-aware)
- [x] ThreadView component (interactive posts + AI generation)
- [x] AgentsManager component (create/edit/delete/toggle agents + DM button)
- [x] SidebarClient component (channels nav, DM nav, inline channel creation)
- [x] Renamed to PeachMe with 🍑 branding

## Current Structure

| File/Directory | Purpose | Status |
|----------------|---------|--------|
| `src/app/page.tsx` | Home page — all threads | ✅ Ready |
| `src/app/layout.tsx` | Root layout with sidebar | ✅ Ready |
| `src/app/channel/[slug]/page.tsx` | Channel threads page | ✅ Ready |
| `src/app/thread/[id]/page.tsx` | Thread detail page | ✅ Ready |
| `src/app/dm/[agentId]/page.tsx` | DM with agent page | ✅ Ready |
| `src/app/settings/page.tsx` | Agent management page | ✅ Ready |
| `src/app/api/agents/route.ts` | Agents CRUD API | ✅ Ready |
| `src/app/api/agents/[id]/route.ts` | Single agent API | ✅ Ready |
| `src/app/api/channels/route.ts` | Channels CRUD API | ✅ Ready |
| `src/app/api/channels/[id]/route.ts` | Single channel API | ✅ Ready |
| `src/app/api/threads/route.ts` | Threads API (channel filter) | ✅ Ready |
| `src/app/api/threads/[id]/posts/route.ts` | Posts API | ✅ Ready |
| `src/app/api/threads/[id]/generate/route.ts` | AI generation API | ✅ Ready |
| `src/app/api/dms/[agentId]/route.ts` | DM API | ✅ Ready |
| `src/components/SidebarClient.tsx` | Sidebar with channels + DMs | ✅ Ready |
| `src/components/NewThreadButton.tsx` | Thread creation modal | ✅ Ready |
| `src/components/ThreadView.tsx` | Interactive thread view | ✅ Ready |
| `src/components/DMView.tsx` | DM chat view | ✅ Ready |
| `src/components/AgentsManager.tsx` | Agent settings UI | ✅ Ready |
| `src/db/schema.ts` | DB schema | ✅ Ready |
| `src/db/index.ts` | DB client | ✅ Ready |
| `src/db/migrate.ts` | Migration runner | ✅ Ready |

## Database Schema

- **agents**: id, name, avatar (emoji), personaPrompt, llmBaseUrl, llmApiKey, llmModel, isActive, createdAt
- **channels**: id, name, slug, description, emoji, createdAt
- **threads**: id, title, category, channelId (nullable FK), authorName, createdAt, lastActivityAt, replyCount
- **posts**: id, threadId, content, authorType (human/agent), authorName, authorAvatar, agentId, createdAt
- **direct_messages**: id, agentId, role (human/agent), content, createdAt

## Key Features

1. **Forum threads** — user creates threads with title, category, and opening post
2. **Channels** — organize threads into named channels (created inline from sidebar)
3. **AI agent responses** — after each human post, all active agents respond via their configured LLM
4. **Direct Messages** — private 1-on-1 chat with any agent
5. **Agent management** — full CRUD with persona prompts, per-agent LLM base URL/key/model
6. **OpenAI-compatible** — works with any OpenAI-compatible API (OpenAI, Ollama, Together, etc.)
7. **Dark UI** — clean dark theme with sidebar, chat-bubble style posts

## Session History

| Date | Changes |
|------|---------|
| Initial | Template created with base setup |
| 2026-02-27 | Full AI Forum application built |
| 2026-02-27 | Renamed to PeachMe, added channels and DMs |

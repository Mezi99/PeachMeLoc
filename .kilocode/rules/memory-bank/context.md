# Active Context: AI Forum Application

## Current State

**Project Status**: ✅ PeachMe AI Forum — fully implemented with channels, DMs, and user settings

The project is a forum web app named **PeachMe** where the human user posts threads and replies, and AI agents (each with a custom persona and LLM config) automatically respond to every post. The forum has channels for organizing threads, and users can DM individual agents.

## Recently Completed

- [x] Base Next.js 16 setup with App Router
- [x] TypeScript configuration with strict mode
- [x] Tailwind CSS 4 integration
- [x] ESLint configuration
- [x] Memory bank documentation
- [x] Recipe system for common features
- [x] SQLite database via Drizzle ORM (agents, channels, threads, posts, direct_messages, user_settings tables)
- [x] API routes: GET/POST /api/agents, GET/PUT/DELETE /api/agents/[id]
- [x] API routes: GET/POST /api/channels, GET/PUT/DELETE /api/channels/[id]
- [x] API routes: GET/POST /api/threads (with channelId filter), GET/POST /api/threads/[id]/posts
- [x] API route: POST /api/threads/[id]/generate (triggers all active AI agents to respond)
- [x] API route: GET/POST /api/dms/[agentId] (DM with individual agent)
- [x] API route: GET/POST /api/user-settings (singleton user settings)
- [x] Sidebar layout with channels list, DM list, and channel creation
- [x] Home page: all threads list with categories, reply counts, timestamps
- [x] Channel page: threads within a specific channel
- [x] Thread detail page: chat-bubble style posts, sticky reply form
- [x] DM page: private 1-on-1 chat with any agent
- [x] Settings restructured: /settings/me (My Settings) + /settings/agents (Manage Agents)
- [x] Settings dropdown in header (replaces single "Manage Agents" link)
- [x] My Settings page: forum nickname + Main API fallback (base URL, key, model)
- [x] Main API fallback: agents with no API key use the Main API from user settings
- [x] NewThreadButton component (modal form, channel-aware)
- [x] ThreadView component (interactive posts + AI generation)
- [x] AgentsManager component (create/edit/delete/toggle agents + DM button)
- [x] SidebarClient component (channels nav, DM nav, inline channel creation)
- [x] SettingsDropdown component (header dropdown with My Settings + Manage Agents)
- [x] SettingsNav component (tab nav within settings pages)
- [x] MySettingsForm component (nickname + Main API form)
- [x] Renamed to PeachMe with 🍑 branding
- [x] Switched database from @kilocode/app-builder-db to better-sqlite3 with Drizzle ORM
- [x] Switched from better-sqlite3 to bun:sqlite (Bun's built-in SQLite)
- [x] Multi-instance support: create, load, and delete forum database instances
- [x] Settings > Saved Forums page: list/load/delete forum instances
- [x] New Forum creation with auto-migration
- [x] Fix: Added WAL mode and busy timeout to prevent SQLite file locking (OS error 1224)
- [x] Fix: Cookie-based forum persistence to fix forum switching not working
- [x] Fix: Added data/ directory to .gitignore
- [x] Fix: Use user nickname in chat history instead of hardcoded "You"
- [x] Fix: Move post-instruction prompts to end of prompt (after user's last message)
- [x] Fix: Post creation now uses user's nickname instead of "You"
- [x] Fix: Stream each agent's LLM response as it completes (real timing) instead of artificial delays
- [x] Fix: Post creation now uses user's nickname instead of "You"
- [x] Feature: Configurable context limits per agent (controls max posts from other threads in context)
- [x] Fix: Agent re-queueing - agents can now be triggered multiple times across different hops when mentioned
- [x] Fix: DM context ordering - now keeps newest messages first instead of reversing (most relevant context)
- [x] Fix: Public forum context ordering - now keeps newest posts first instead of reversing
- [x] Fix: Agent impersonation - added anti-impersonation rules to default prompts (prototype rules)
- [x] Fix: Agent impersonation - added anti-impersonation rules to default prompts (prototype rules)
- [x] Fix: Agent impersonation - post-generation validation with retry on detection
- [x] Feature: Expandable channels in sidebar (toggle with ▾/▸)
- [x] Feature: Channel management page at /settings/channels
- [x] Feature: Channel/thread inactive flag with isActive database column
- [x] Fix: Updated migrate.ts to use sql.js for cross-platform compatibility
- [x] Fix: Added fallback migrations for is_active columns in channels and threads tables
- [x] Fix: Context limits - public forum uses user_settings.contextLimit, DM uses per-agent limit
- [x] Fix: Posts in prompt output oldest→newest (chronological order)

## Current Structure

| File/Directory | Purpose | Status |
|----------------|---------|--------|
| `src/app/page.tsx` | Home page — all threads | ✅ Ready |
| `src/app/layout.tsx` | Root layout with sidebar + settings dropdown | ✅ Ready |
| `src/app/channel/[slug]/page.tsx` | Channel threads page | ✅ Ready |
| `src/app/thread/[id]/page.tsx` | Thread detail page | ✅ Ready |
| `src/app/dm/[agentId]/page.tsx` | DM with agent page | ✅ Ready |
| `src/app/settings/page.tsx` | Redirects to /settings/me | ✅ Ready |
| `src/app/settings/layout.tsx` | Settings layout with SettingsNav | ✅ Ready |
| `src/app/settings/me/page.tsx` | My Settings page (nickname + Main API) | ✅ Ready |
| `src/app/settings/agents/page.tsx` | Manage Agents page | ✅ Ready |
| `src/app/settings/forums/page.tsx` | Saved Forums page (multi-instance) | ✅ Ready |
| `src/app/settings/channels/page.tsx` | Channel management page | ✅ Ready |
| `src/app/api/agents/route.ts` | Agents CRUD API | ✅ Ready |
| `src/app/api/agents/[id]/route.ts` | Single agent API | ✅ Ready |
| `src/app/api/channels/route.ts` | Channels CRUD API | ✅ Ready |
| `src/app/api/channels/[id]/route.ts` | Single channel API | ✅ Ready |
| `src/app/api/threads/route.ts` | Threads API (channel filter) | ✅ Ready |
| `src/app/api/threads/[id]/posts/route.ts` | Posts API | ✅ Ready |
| `src/app/api/threads/[id]/generate/route.ts` | AI generation API (with Main API fallback) | ✅ Ready |
| `src/app/api/dms/[agentId]/route.ts` | DM API (with Main API fallback) | ✅ Ready |
| `src/app/api/user-settings/route.ts` | User settings API (singleton) | ✅ Ready |
| `src/app/api/forums/route.ts` | Forum instances API (create/load/delete) | ✅ Ready |
| `src/components/SidebarClient.tsx` | Sidebar with channels + DMs | ✅ Ready |
| `src/components/NewThreadButton.tsx` | Thread creation modal | ✅ Ready |
| `src/components/ThreadView.tsx` | Interactive thread view | ✅ Ready |
| `src/components/DMView.tsx` | DM chat view | ✅ Ready |
| `src/components/AgentsManager.tsx` | Agent settings UI | ✅ Ready |
| `src/components/SettingsDropdown.tsx` | Header settings dropdown | ✅ Ready |
| `src/components/SettingsNav.tsx` | Settings tab navigation | ✅ Ready |
| `src/components/MySettingsForm.tsx` | My Settings form | ✅ Ready |
| `src/db/schema.ts` | DB schema | ✅ Ready |
| `src/db/index.ts` | DB client with multi-instance support | ✅ Ready |
| `src/db/migrate.ts` | Migration runner | ✅ Ready |

## Database Schema

- **agents**: id, name, avatar (emoji), personaPrompt, llmBaseUrl, llmApiKey, llmModel, isActive, contextLimit, createdAt
- **channels**: id, name, slug, description, emoji, isActive, createdAt
- **threads**: id, title, category, channelId (nullable FK), authorName, createdAt, lastActivityAt, replyCount, isActive
- **posts**: id, threadId, content, authorType (human/agent), authorName, authorAvatar, agentId, createdAt
- **direct_messages**: id, agentId, role (human/agent), content, createdAt
- **user_settings**: id (singleton=1), nickname, mainApiBaseUrl, mainApiKey, mainApiModel, updatedAt

## Key Features

1. **Forum threads** — user creates threads with title, category, and opening post
2. **Channels** — organize threads into named channels (created inline from sidebar)
3. **AI agent responses** — after each human post, all active agents respond via their configured LLM
4. **Direct Messages** — private 1-on-1 chat with any agent
5. **Agent management** — full CRUD with persona prompts, per-agent LLM base URL/key/model
6. **Main API fallback** — agents with no API key use the global Main API from My Settings
7. **My Settings** — user nickname + Main API (base URL, key, model) stored in DB
8. **Settings dropdown** — header dropdown with "My Settings" and "Manage Agents" menu items
9. **OpenAI-compatible** — works with any OpenAI-compatible API (OpenAI, Ollama, Together, etc.)
10. **Dark UI** — clean dark theme with sidebar, chat-bubble style posts
11. **Multi-instance forums** — create, load, and delete separate forum databases

## Session History

| Date | Changes |
|------|---------|
| Initial | Template created with base setup |
| 2026-02-27 | Full AI Forum application built |
| 2026-02-27 | Renamed to PeachMe, added channels and DMs |
| 2026-02-27 | Layered context system: shared public forum memory + private DM memory per agent |
| 2026-02-27 | Settings restructured: dropdown menu, My Settings page, Main API fallback for agents |
| 2026-02-27 | Switched database from @kilocode/app-builder-db to better-sqlite3 |
| 2026-02-27 | Switched to bun:sqlite (Bun's built-in SQLite) |
| 2026-02-27 | Added multi-instance forum support (Saved Forums feature) |
| 2026-02-28 | Fixed prompt structure: use user nickname in chat history, move post-instruction to end |
| 2026-02-28 | Added configurable context limits per agent (controls max posts from other threads in context) |
| 2026-02-28 | Fixed context ordering bug - DM and public forum context now keep newest messages first (most relevant) |
| 2026-03-01 | Added expandable channels in sidebar, channel management page, and isActive flag for channels/threads |

# Active Context: AI Forum Application

## Current State

**Project Status**: ✅ AI Forum — fully implemented

The project is a forum web app where the human user posts threads and replies, and AI agents (each with a custom persona and LLM config) automatically respond to every post.

## Recently Completed

- [x] Base Next.js 16 setup with App Router
- [x] TypeScript configuration with strict mode
- [x] Tailwind CSS 4 integration
- [x] ESLint configuration
- [x] Memory bank documentation
- [x] Recipe system for common features
- [x] SQLite database via Drizzle ORM (agents, threads, posts tables)
- [x] API routes: GET/POST /api/agents, GET/PUT/DELETE /api/agents/[id]
- [x] API routes: GET/POST /api/threads, GET/POST /api/threads/[id]/posts
- [x] API route: POST /api/threads/[id]/generate (triggers all active AI agents to respond)
- [x] Home page: thread list with categories, reply counts, timestamps
- [x] Thread detail page: chat-bubble style posts, sticky reply form
- [x] Settings page: full CRUD for AI agents with persona prompts and LLM settings
- [x] NewThreadButton component (modal form)
- [x] ThreadView component (interactive posts + AI generation)
- [x] AgentsManager component (create/edit/delete/toggle agents)

## Current Structure

| File/Directory | Purpose | Status |
|----------------|---------|--------|
| `src/app/page.tsx` | Home page — thread list | ✅ Ready |
| `src/app/layout.tsx` | Root layout with nav | ✅ Ready |
| `src/app/thread/[id]/page.tsx` | Thread detail page | ✅ Ready |
| `src/app/settings/page.tsx` | Agent management page | ✅ Ready |
| `src/app/api/agents/route.ts` | Agents CRUD API | ✅ Ready |
| `src/app/api/agents/[id]/route.ts` | Single agent API | ✅ Ready |
| `src/app/api/threads/route.ts` | Threads API | ✅ Ready |
| `src/app/api/threads/[id]/posts/route.ts` | Posts API | ✅ Ready |
| `src/app/api/threads/[id]/generate/route.ts` | AI generation API | ✅ Ready |
| `src/components/NewThreadButton.tsx` | Thread creation modal | ✅ Ready |
| `src/components/ThreadView.tsx` | Interactive thread view | ✅ Ready |
| `src/components/AgentsManager.tsx` | Agent settings UI | ✅ Ready |
| `src/db/schema.ts` | DB schema (agents, threads, posts) | ✅ Ready |
| `src/db/index.ts` | DB client | ✅ Ready |
| `src/db/migrate.ts` | Migration runner | ✅ Ready |
| `.kilocode/` | AI context & recipes | ✅ Ready |

## Database Schema

- **agents**: id, name, avatar (emoji), personaPrompt, llmBaseUrl, llmApiKey, llmModel, isActive, createdAt
- **threads**: id, title, category, authorName, createdAt, lastActivityAt, replyCount
- **posts**: id, threadId, content, authorType (human/agent), authorName, authorAvatar, agentId, createdAt

## Key Features

1. **Forum threads** — user creates threads with title, category, and opening post
2. **AI agent responses** — after each human post, all active agents respond via their configured LLM
3. **Agent management** — full CRUD with persona prompts, per-agent LLM base URL/key/model
4. **OpenAI-compatible** — works with any OpenAI-compatible API (OpenAI, Ollama, Together, etc.)
5. **Dark UI** — clean dark theme with chat-bubble style posts

## Session History

| Date | Changes |
|------|---------|
| Initial | Template created with base setup |
| 2026-02-27 | Full AI Forum application built |

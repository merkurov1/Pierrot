# Pierrot iOS — Full Product Audit & Implementation Plan

Audit date: **2026-11-02**
Mobile repository: `/workspaces/Pierrot`, package `/workspaces/Pierrot/pierrot-ios`
Backend repository: `/workspaces/newlove`
This document is a plan. No EAS build, publication, paid service, migration or
credential creation was performed during this audit.

---

## 0. Executive summary

The first mobile version is a real client, not a mock:

- chat is connected to `POST /api/pierrot-web`;
- Flow is connected to `GET /api/flow/items`;
- owner Brain research is connected to `POST /api/admin/brain/research`;
- owner URL intake is connected to the existing Pierrot owner branch;
- health is connected to `GET /api/health`;
- auth uses the existing Supabase email OTP.

The next product step is **not** a visual rewrite. It is a set of four
additive layers:

1. a light-first design system that can also render the existing dark language;
2. real user identity (name + avatar) and a compact, source-backed project
   pulse in the existing chat panel;
3. a server-backed conversation archive and decision memory, because the
   current API has no authenticated transcript read route;
4. new owner tools: unified search, Media/Graph modes, Dev prompts, read-only
   GitHub, and optional web search.

The backend must remain the only AI/RAG/worker layer. The mobile app only
presents results and stores device-local cache.

**Recommended order:** UI shell and identity first, then archive/decision
schema and read APIs, then auth providers, then search/Media/Graph, then Dev and
GitHub, then web search, then TestFlight/App Store. Passkeys and widgets come
after the first TestFlight because they require native builds, associated
domains and Supabase beta configuration.

---

## 1. Verified repository state

### 1.1 Mobile repository

- Path: `/workspaces/Pierrot`
- Branch: `main`
- HEAD: `5dce026 Add Pierrot iOS app`
- There are untracked root helper files (`OPEN_APP.txt`, QR, start/build
  scripts) but no uncommitted changes inside `pierrot-ios` at audit time.
- The app is Expo SDK **58.0.22**, React Native **0.88.1**, React **19.3.0**,
  Expo Router **58.0.29**, TypeScript **6.0.3**.
- Current native dependencies include `expo-secure-store`, `expo-sqlite`,
  `expo-clipboard`, `expo-crypto`, `expo-image`, `expo-web-browser`,
  `expo-dev-client`.
- `app.json` currently forces `userInterfaceStyle: "dark"` and a dark
  background. The UI has no light palette and no theme switch.
- Current bottom navigation is four tabs: **Chat, Brain, Flow, Settings**
  (`src/app/(tabs)/_layout.tsx`).
- iPad Chat is a master/detail layout: `ConversationSidebar` + chat pane
  (`src/app/(tabs)/index.tsx`). Flow is a 1/2/3-column grid.
- Current auth is raw Supabase GoTrue OTP/REST, not `@supabase/supabase-js`
  (`src/api/supabaseAuth.ts`).
- Current local history is SQLite (`src/chat/storage.ts`) with no user scope.
- Current settings store the session in `expo-secure-store`.
- Current EAS project: `@merkurov/pierrot-ios`, ID
  `9344571a-c8d4-4737-b3b3-57c70d3ea6e5`; `eas.json` has development,
  preview and production profiles. No Apple credentials are configured yet.
- Existing `TODO.md` already records: template icon, Apple credentials,
  Supabase OTP template verification, streaming, server archive, human
  takeover, unit/E2E tests, encrypted SQLite, push, deep links, accessibility
  and localisation.

### 1.2 Backend repository

- Path: `/workspaces/newlove`
- Branch: `main`
- HEAD: `2e55594 fix(admin): offset content below fixed header`
- Working tree clean. Repository is read-only for this task.
- Next.js **14.2.5**, React **18.3.1**, Supabase JS declared as `^2.76.1`;
  `package-lock.json` resolves `@supabase/supabase-js` **2.118.0**.
- Production site: `https://www.merkurov.love` (Vercel headers observed).
- No `schema_migrations` table exists; migration parity is checked manually
  against `information_schema` / `pg_indexes`.
- `media_archive_records` is a live table referenced by migrations, but its
  original `CREATE TABLE` is not present in the repository migration history.
  Any new migration touching it must be additive and defensive.
- Operational context is documented in `docs/production-operations.md` and
  `AUDIT_REPORT.md`; those documents were used for queue, migration and
  worker-safety facts, not as a substitute for reading the code.

### 1.3 Live smoke checks performed earlier in this workspace

- `GET /api/health` → HTTP 200, `database/supabase/env = true`.
- `GET /api/flow/items` → HTTP 200 with real published items.
- `POST /api/pierrot-web` → HTTP 200, real Gemini answer
  (`gemini-3.5-flash` observed).
- `POST /api/admin/brain/research` without credentials → HTTP 401, as expected.
- Pierrot avatar URL
  `https://txvkqcitalfbjytmnawq.supabase.co/storage/v1/object/public/artifacts/Pierrot.jpg`
  → HTTP 200, `image/jpeg`.

---

## 2. Actual architecture of the two projects

### 2.1 Mobile client today

```text
Expo Router
  (tabs)
    Chat      -> src/api/pierrot.ts -> POST /api/pierrot-web
    Brain     -> src/api/brain.ts   -> POST /api/admin/brain/research
                                     -> owner URL intake via /api/pierrot-web
    Flow      -> src/api/flow.ts    -> GET /api/flow/items
    Settings  -> src/api/health.ts  -> GET /api/health
                 src/api/account.ts -> GET /api/auth/me
  history modal -> local SQLite only
```

- `AuthContext` stores a Supabase access/refresh session in SecureStore.
- `ChatContext` stores conversations and messages in SQLite.
- No prompt, RAG, model routing or provider key exists in the app.
- No direct Supabase table access; only GoTrue auth endpoints and newlove
  APIs.

### 2.2 Backend Pierrot today

```text
POST /api/pierrot-web
  -> rate limit (20/min public, 60/min internal Telegram)
  -> consent normalization
  -> optional server conversation store
  -> human-takeover gate (409)
  -> deterministic commercial planner
  -> optional public RAG / owner Brain RAG / Media RAG
  -> Gemini -> DeepSeek direct -> OpenRouter DeepSeek
  -> JSON response (no streaming)
```

Verified files:

- `app/api/pierrot-web/route.ts`
- `lib/pierrot/model.ts`
- `lib/pierrot/conversation.ts`
- `lib/pierrot/serverStore.ts`
- `lib/pierrot/urlIntake.ts`
- `lib/knowledge/rag/*`
- `lib/knowledge/rag/config.ts`
- `lib/operations/circuitBreaker.ts`

### 2.3 Existing read APIs reused by new mobile screens

These already exist and should be reused, not duplicated:

```http
POST /api/media/search          (public, 20/min)
{ "query": "...", "filters": { "topic": "...", "language": "EN", "outlet": "...", "from": "YYYY-MM-DD", "to": "YYYY-MM-DD" } }
-> { status, query, semantic, count, summary, results: [{ id, slug, title, outlet, date, lang, kind, topic, summary, url, href, quotes, related }] }
```

```http
POST /api/admin/media/intelligence/search   (owner/admin)
{ "query": "...", "filters": {...} }
-> { status: "ok", data: { summary, facts, interpretation, insufficient, results, count } }
```

```http
GET /api/admin/media-records                (owner/admin, up to 500)
GET /api/admin/media-records/:id/analysis  (owner/admin)
-> media record + document + analysis { run, quotes, topics, editorialRole, entities, relations } + runs + source
```

```http
GET /api/admin/brain/graph?q=&types=&limit=  (owner/admin)
-> { status, nodes, edges, stats }
```

```http
GET /api/flow/items?limit=&offset=           (public)
-> { items, hasMore, total, nextOffset }
```

`/api/media/search` is the public search surface used by the website’s Media
Archive. It performs semantic retrieval internally but maps results back to
public archive records and verified quotes; mobile must not bypass that mapping
or expose owner chunks.

### 2.4 Actual auth surface

| Method | Website | Mobile today | Notes |
|---|---|---|---|
| Email OTP | Yes, `/login` | Yes | Raw GoTrue REST; 6-digit code |
| Google OAuth | Yes | No | Website uses Supabase `signInWithOAuth` |
| Sign in with Apple | No | No | Native-only implementation will require Apple Developer setup |
| Passkey | Button exists; `signInWithPasskey` | No | Supabase beta; website enrollment code uses `signUpWithPasskey`, while current docs use `registerPasskey` — treat website passkey enrollment as unverified |
| Web3 wallet | Yes | No | Not requested for mobile |

Server auth facts:

- `/api/auth/me` supports cookies and
  `Authorization: Bearer <Supabase access token>`
  (`lib/getUserAndSupabaseForRequest.ts`, `lib/supabase-server.ts`).
- Admin routes use `requireAdminFromRequest`:
  `x-admin-secret`, Telegram initData, ADMIN Supabase bearer, or ADMIN cookie.
- Owner Brain additionally uses `isVerifiedOwnerUser` /
  `isVerifiedOwnerCredential`; service identity is not a user identity.
- `pierrot_conversations`, `pierrot_messages`, `pierrot_events` have RLS
  enabled and **no** anon/authenticated grants. Only the service role reads
  them.
- There is no authenticated transcript read endpoint. Only
  `DELETE /api/pierrot/conversations` exists for browser-held IDs.
- There is no self-service account-deletion endpoint. Only the admin route
  `POST /api/admin/users` with `action: 'deleteUser'` exists. A user-facing
  deletion flow is an App Store blocker once account creation is offered.

### 2.5 Data that actually exists

| Domain | Tables / views | Access |
|---|---|---|
| Pierrot conversations | `pierrot_conversations`, `pierrot_messages`, `pierrot_events` | service role only, 90-day retention |
| Pierrot analytics | `pierrot_v_conversation_overview`, `pierrot_v_message_counts`, `pierrot_v_quality_indicators`, etc. | service role only |
| Brain | `knowledge_documents`, `knowledge_chunks` | service role only; `public_retrieval_allowed` for public RAG |
| Brain queues | `brain_ingestion_runs/jobs`, `brain_graph_runs/jobs`, `brain_worker_runs` | service role only |
| Knowledge graph | `brain_entities`, `brain_entity_mentions`, `brain_relationships`, `brain_thematic_summaries`, `brain_editorial_suggestions` | service role only |
| Media | `media_archive_records` (public published rows), `media_analysis_runs`, `media_quotes`, `media_analysis_topics`, `media_editorial_roles`, `media_record_relations` | public published records; analysis owner-only |
| Flow | `items` | public published flow rows; `flow_ai_context` service role only |
| Users | `public.users`, `profiles` used by browser, `roles`, `user_roles` | `users` has own-row RLS; roles are service-role/admin scoped |
| Ops | `ops_runtime_settings`, `worker_locks`, `brain_worker_runs`, `ops_events` | service role only |

Important: `public.users` currently has no `avatar_url` column. The app can show
the avatar already returned by `/api/auth/me` from Supabase user metadata; a
custom uploaded avatar would need a new column + storage policy.

---

## 3. Existing feature matrix

| Feature | Current state | Real source | Gap / decision |
|---|---|---|---|
| Chat | Working | `POST /api/pierrot-web` | No streaming; local history only |
| Chat history | Local SQLite | `src/chat/storage.ts` | No server read; no cross-device sync |
| Markdown | Working | custom renderer | Keep; add decision/context actions |
| Brain research | Working for owner | `POST /api/admin/brain/research` | Owner-only; no graph/media UI |
| Brain URL intake | Working for owner | owner branch of `/api/pierrot-web` | No direct file upload in app |
| Media Intelligence | Backend works | `/api/media/search`, `/api/admin/media/intelligence/search`, `/api/admin/media-records/[id]/analysis` | No mobile screen |
| Flow | Working | `GET /api/flow/items` | Read-only |
| Auth email OTP | Working | Supabase GoTrue `/auth/v1/otp`, `/verify` | Keep as fallback |
| Auth Google | Website only | Supabase OAuth | Mobile needs native Google ID token flow |
| Auth Apple | Missing | none | Native Apple setup + Supabase provider |
| Passkey | Website unverified | Supabase beta | Mobile later; native plugin + associated domains |
| User identity | Name/email only | `/api/auth/me` | Add avatar; no custom avatar column |
| Theme | Dark only | `src/constants/theme.ts` | Add light default + system + dark |
| Bottom navigation | 4 tabs | `src/app/(tabs)/_layout.tsx` | Preserve; add Dev additively |
| iPad master/detail | Working | Chat sidebar | Add metrics at bottom; keep logic |
| Project metrics | None | admin views/tables | New owner overview endpoint |
| Conversation archive | Local only | SQLite | New server read API + schema |
| Decision memory | None | none | New table + API + local cache |
| Unified search | None | media search + Brain retrieval + Flow + archive | New fan-out endpoint |
| Dev / OpenCode prompts | None | local templates | No backend needed |
| GitHub read-only | None | GitHub API | New server proxy + credentials |
| Web search | Only auction-specific scraper | `/api/monitor/search` | New provider-backed endpoint |
| Native share | Clipboard only | expo-clipboard | Add expo-sharing |
| Push | None | none | Later; APNs + token table |
| App Store build | EAS project only | EAS | Apple credentials + TestFlight |

---

## 4. New feature matrix and required changes

| Feature | Client work | Backend work | New credentials | Can ship without backend? |
|---|---|---|---|---|
| Light/dark/system theme | Theme provider, palette, all styles | None | None | **Yes** |
| Pierrot avatar | `expo-image` + existing URL | None | None | **Yes** |
| Remove “Digital Shadow” | Remove text in sidebar/empty state | None | None | **Yes** |
| User name/avatar | Read `me.user`, fallback initials | None for Google/metadata avatar | None | **Yes** (metadata avatar) |
| Metrics shell | Sidebar component + loading/empty states | `/api/mobile/overview` for real numbers | None | **UI only**; numbers need endpoint |
| Conversation archive | History UI, sync, cache | `GET /api/mobile/conversations*`, schema | Supabase migrations | **No** |
| Decision memory | Save/edit/list/search | CRUD endpoints + table | Supabase migrations | Local-only version **yes** |
| Media Intelligence | Brain tab segment | Reuse existing media APIs | None for public; owner role for deep | **Yes**, search-only |
| Graph UI | Brain tab segment | Reuse `/api/admin/brain/graph` | None | **Yes** |
| Unified search | Search sheet + scopes | `POST /api/mobile/search` | None for internal; web provider optional | Partial: Media+Flow+local archive |
| Dev / OpenCode prompt | Local prompt composer + share | None | None | **Yes** |
| GitHub read-only | Repo/tree/file/commits viewer | GitHub proxy + allowlist | GitHub App or fine-grained PAT | Public repos only, no private |
| Web search | Web scope in search | Provider adapter endpoint | Search API key | **No** |
| Apple sign-in | Native button | Supabase provider config | Apple Developer/App ID | **No** (native + config) |
| Google sign-in | Native button | Supabase provider config | Google iOS OAuth client | **No** (dev build) |
| Passkey | Native WebAuthn ceremony + settings | Supabase beta config | Apple associated domain/AASA | **No** |
| Push notifications | Permission, token registration | token table + send worker | APNs key | **No** |
| Account deletion | Settings action | `DELETE /api/mobile/account` | None | **No** |
| App Store release | Metadata/screenshots | Privacy policy/URL | Apple account | **No** |

---

## 5. What can be implemented without changing the backend

These are safe, useful increments and should be done first:

1. **Light theme by default**, with System and Dark options, keeping the
   website’s warm palette: `#FAF8F5`, `#FDFCFA`, `#211F1F`, `#37332D`,
   `#D9D3CD`, `#990F3D` as a restrained accent. Add a matching dark palette.
2. **Pierrot avatar** from the verified `PIERROT_AVATAR_SRC` URL
   (`lib/pierrot/config.ts`) in Chat header/empty state.
3. **Remove “Digital Shadow”** from `ConversationSidebar` and any copy.
4. **User identity**: show `me.user.name` and `me.user.image` from
   `/api/auth/me`; fall back to initials. No new table.
5. **Keep the existing bottom navigation and iPad master/detail logic.**
6. **Metrics component** with a real-but-limited initial dataset:
   - Flow total from `/api/flow/items?limit=1` (`total`);
   - backend health from `/api/health`;
   - local conversation count from SQLite.
   These are real. The four richer metrics need the new overview endpoint.
7. **Local decision memory** in SQLite (user-confirmed decisions) and a local
   prompt composer for OpenCode. This can later sync to the server.
8. **Media search** using the existing public `/api/media/search`; this is a
   real endpoint with verified quotes and semantic fallback.
9. **Graph viewer** using the existing `/api/admin/brain/graph` for owner.
10. **Clipboard/share** via `expo-clipboard` + `expo-sharing`; haptics via
    `expo-haptics`.
11. **Public GitHub repos** can be browsed with unauthenticated GitHub REST,
    but rate limits are low and private repos are impossible. This is a
    demo-only path; the real integration needs the server proxy.

---

## 6. Data flows

### 6.1 Chat and owner RAG

```text
iOS Chat
  -> POST /api/pierrot-web (bearer optional)
  -> rate limit + consent
  -> deterministic commercial planner
  -> public / owner / media retrieval (existing)
  -> Gemini -> DeepSeek -> OpenRouter
  -> JSON response
  -> local SQLite cache
```

### 6.2 Server archive

```text
iOS Chat
  -> POST /api/pierrot-web (bearer)
  -> ensurePierrotConversation(..., userId)
  -> pierrot_conversations.user_id
  -> pierrot_messages / pierrot_events (only if consent granted)
  -> GET /api/mobile/conversations (bearer)
  -> user-scoped archive + messages
```

### 6.3 Metrics

```text
iOS sidebar
  -> GET /api/mobile/overview (owner bearer)
  -> pierrot_v_conversation_overview
     knowledge_documents
     items
     media_archive_records / media_quotes
     brain_ingestion_jobs / brain_graph_jobs / media_analysis_runs
  -> compact metrics + deterministic status line
```

### 6.4 Unified search

```text
iOS search sheet
  -> POST /api/mobile/search
     -> Brain retrieval (existing RAG, owner)
     -> Media search (existing media search)
     -> Flow items (SQL)
     -> Archive messages (user-scoped SQL)
     -> GitHub proxy (optional)
     -> Web provider (optional)
  -> grouped results; no new LLM answer
```

### 6.5 Dev prompt

```text
iOS Dev screen
  -> select messages/decisions/files
  -> local template renderer
  -> preview
  -> Copy / Share sheet / Save draft
  -> no model call, no backend AI
```

### 6.6 GitHub and web search

```text
iOS -> /api/mobile/github/* -> GitHub API (server token)
iOS -> /api/mobile/web-search -> provider API (server key)
```

The mobile app never receives either server credential.

---

## 7. Proposed new APIs and contracts

All new endpoints:

- require `Authorization: Bearer <Supabase access token>`;
- verify the user server-side; owner-only scopes additionally require ADMIN;
- use `Cache-Control: no-store` for user data;
- return `{ error, code, retryAfter? }` on failure;
- have per-user/IP rate limits;
- validate all IDs, paths, lengths and enum values;
- never return service-role keys, provider keys or another user’s data.

### 7.1 `GET /api/mobile/overview` — owner metrics

Rate limit: 30/min. Auth: ADMIN owner.

```json
{
  "generatedAt": "2026-11-02T12:00:00.000Z",
  "status": {
    "level": "ok",
    "summary": "All clear. Last Flow item 2h ago.",
    "action": null
  },
  "metrics": [
    {
      "id": "conversations_7d",
      "label": "Conversations",
      "value": 14,
      "unit": "7d",
      "period": { "from": "2026-10-26", "to": "2026-11-02" },
      "source": "pierrot_v_conversation_overview",
      "asOf": "2026-11-02T11:59:30.000Z",
      "refreshSeconds": 300
    },
    {
      "id": "brain_documents",
      "label": "Brain",
      "value": 327,
      "delta": 8,
      "unit": "docs",
      "period": "current / last 7d",
      "source": "knowledge_documents",
      "asOf": "2026-11-02T11:58:00.000Z",
      "refreshSeconds": 900
    },
    {
      "id": "flow_30d",
      "label": "Flow",
      "value": 9,
      "unit": "30d",
      "period": "last 30 days",
      "source": "items",
      "asOf": "2026-11-02T11:58:00.000Z",
      "refreshSeconds": 900
    },
    {
      "id": "media_records",
      "label": "Media",
      "value": 223,
      "delta": 3,
      "unit": "records",
      "period": "current / last 30d",
      "source": "media_archive_records",
      "asOf": "2026-11-02T11:30:00.000Z",
      "refreshSeconds": 1800
    }
  ],
  "queues": {
    "brain": { "queued": 0, "processing": 0, "failed": 0 },
    "graph": { "queued": 0, "processing": 0, "failed": 0 },
    "media": { "queued": 0, "processing": 0, "failed": 0 }
  }
}
```

Deterministic status rules (no AI):

- `degraded` if `/api/health` is not healthy or DB is unavailable;
- `attention` if failed queue jobs > 0, or oldest queued job > 24h;
- `ok` otherwise.

Metric definitions:

| Metric | Formula | Source | Period |
|---|---|---|---|
| Conversations | count `started_at >= now()-7d` (denied consent creates no stored row) | `pierrot_v_conversation_overview` | 7 days |
| Brain | count `ingestion_status='completed'`; delta `created_at >= now()-7d` | `knowledge_documents` | current + 7 days |
| Flow | count `status='published' AND visibility='public' AND published_at >= now()-30d` | `items` | 30 days |
| Media | count `status='published'`; delta `created_at >= now()-30d` | `media_archive_records` | current + 30 days |

No message text, titles, query text or document excerpts are returned by the
overview endpoint.

### 7.2 Conversation archive

`GET /api/mobile/conversations?limit=30&cursor=<opaque>&archived=false`

```json
{
  "items": [
    {
      "id": "conversation-id",
      "title": "AI regulation and the archive",
      "startedAt": "2026-11-01T10:00:00.000Z",
      "lastMessageAt": "2026-11-01T10:04:00.000Z",
      "messageCount": 8,
      "status": "active",
      "pinned": false,
      "archived": false,
      "transcriptAvailable": true
    }
  ],
  "nextCursor": null,
  "hasMore": false
}
```

`GET /api/mobile/conversations/:id`

```json
{
  "id": "conversation-id",
  "title": "…",
  "startedAt": "…",
  "lastMessageAt": "…",
  "status": "active",
  "consentState": "granted",
  "transcriptAvailable": true,
  "messages": [
    {
      "id": "message-id",
      "role": "user|assistant",
      "content": "…",
      "createdAt": "…",
      "provider": "gemini|deepseek|openrouter|null"
    }
  ]
}
```

If consent is pending/denied, return metadata with `transcriptAvailable: false`
and no messages. Never read by ID alone; require `user_id = auth.uid()`.

`PATCH /api/mobile/conversations/:id`

```json
{ "title": "Short title", "pinned": true, "archived": false }
```

`DELETE /api/mobile/conversations/:id` → 204.

### 7.3 Decision memory

`POST /api/mobile/decisions`

```json
{
  "title": "Use the archive as the source of truth",
  "decision": "Server archive is authoritative for signed-in users; SQLite remains an offline cache.",
  "rationale": "Cross-device continuity and auditability.",
  "status": "decided",
  "tags": ["architecture", "mobile"],
  "conversationId": "conversation-id",
  "messageId": "assistant-message-id",
  "sourceRefs": [
    { "documentId": "doc_…", "chunkId": "chk_…", "url": "https://…" }
  ]
}
```

`GET /api/mobile/decisions?q=&status=&tag=&limit=30&cursor=…` returns decisions
owned by the authenticated user. `PATCH` changes title/decision/rationale/
status/tags/reviewAt. `DELETE` is soft-delete or hard-delete as product chooses;
recommend hard-delete for privacy.

### 7.4 Unified search

`POST /api/mobile/search`

```json
{
  "query": "AI regulation",
  "scopes": ["brain", "media", "flow", "archive", "github", "web"],
  "limit": 6
}
```

```json
{
  "query": "AI regulation",
  "partial": false,
  "results": [
    {
      "scope": "brain",
      "type": "document",
      "title": "…",
      "subtitle": "…",
      "excerpt": "…",
      "deepLink": "pierrot://brain?document=doc_…",
      "source": "knowledge_documents",
      "similarity": 0.81
    }
  ],
  "generatedAt": "…"
}
```

Rules:

- `brain` uses `retrieveBrainEvidence` (owner only), not the research LLM.
- `media` uses existing `searchMediaIntelligence({ answerMode: 'none' })`;
  public users see only public records/verified quotes.
- `flow` queries `items` (published/public).
- `archive` queries only `user_id = auth.uid()`.
- `github` and `web` are optional and return `unavailable` per scope if not
  configured.
- max 300 chars query, 20 requests/min, per-scope timeout 3s, total 10s.
- no generated answer; results are links/snippets. An “Ask Pierrot” action may
  open Chat with the selected context.

### 7.5 GitHub read-only proxy

```text
GET /api/mobile/github/repos
GET /api/mobile/github/repos/:owner/:repo/tree?ref=<branch>
GET /api/mobile/github/repos/:owner/:repo/file?path=<path>&ref=<branch>
GET /api/mobile/github/repos/:owner/:repo/commits?limit=20
```

- Auth: owner ADMIN.
- Repo allowlist from `GITHUB_ALLOWED_REPOS` (comma-separated
  `owner/repo`), no arbitrary repo URL.
- Max file size 200 KB; binary → `{ binary: true }`, no content.
- Path validation; no `..`, no absolute paths, no symlink traversal.
- Read-only server token: GitHub App installation token (recommended) or a
  fine-grained PAT with `Contents: read` / `Metadata: read` only.
- Server memory cache 60s; rate limit 60/min; map upstream 401/403/404/429.
- No POST/PATCH/PUT/DELETE, no issues/PR mutation, no webhooks.

### 7.6 Web search

`POST /api/mobile/web-search`

```json
{ "query": "…", "limit": 8 }
```

```json
{
  "provider": "brave",
  "results": [
    {
      "title": "…",
      "url": "https://…",
      "snippet": "…",
      "publishedAt": null,
      "source": "example.com"
    }
  ],
  "fetchedAt": "…"
}
```

- Auth: owner ADMIN; rate limit 10/min; query max 300 chars.
- Provider key only on the server (`BRAVE_SEARCH_API_KEY` or
  `TAVILY_API_KEY`).
- No HTML scraping; do not reuse `/api/monitor/search` (auction-specific).
- Only snippets/links, no automatic page fetch. If page fetching is added later,
  validate schemes and block private IPs (SSRF).
- Cache 5 minutes per normalized query.
- If no key: return `503 { code: 'web_search_not_configured' }`; UI hides or
  disables the scope.

### 7.7 Account deletion

`DELETE /api/mobile/account`

- Auth required; body `{ "confirm": "DELETE" }`; recent re-authentication
  recommended.
- Deletes user-owned archive/decisions, avatar objects if added, then
  `auth.admin.deleteUser` server-side.
- Revokes sessions.
- Rate limit 1/hour per user.
- Required for App Store guideline 5.1.1(v) because the app offers account
  creation.

---

## 8. Conversation Archive and Decision Memory model

### 8.1 Schema changes

Additive migration:

```sql
alter table public.pierrot_conversations
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists title text,
  add column if not exists pinned boolean not null default false,
  add column if not exists archived_at timestamptz,
  add column if not exists retention_days integer,
  add column if not exists summary text,
  add column if not exists summary_generated_at timestamptz;

create index if not exists pierrot_conversations_user_last_idx
  on public.pierrot_conversations (user_id, last_message_at desc);
```

- `user_id` is nullable for legacy/anonymous rows.
- New rows created while authenticated receive the verified `user_id`.
- Existing rows are not backfilled; anonymous conversations stay anonymous.
- `title` max 200; derived from first user message server-side, not trusted
  title input on create.
- `retention_days` null means current 90-day expiry. Decisions are separate and
  do not expire automatically.
- Keep RLS enabled and **no** anon/authenticated grants. API uses service role
  after verifying the bearer.

New table:

```sql
create table if not exists public.pierrot_decisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id text references public.pierrot_conversations(id) on delete set null,
  message_id text,
  title text not null check (char_length(title) between 1 and 200),
  decision text not null check (char_length(decision) between 1 and 4000),
  rationale text check (rationale is null or char_length(rationale) <= 4000),
  status text not null default 'decided'
    check (status in ('open','decided','superseded','archived')),
  tags text[] not null default '{}'::text[],
  source_refs jsonb not null default '[]'::jsonb
    check (jsonb_typeof(source_refs) = 'array' and pg_column_size(source_refs) <= 32768),
  decided_at timestamptz,
  review_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pierrot_decisions_user_status_idx
  on public.pierrot_decisions (user_id, status, updated_at desc);
```

- Enable RLS on `pierrot_decisions`; revoke all from `anon` and
  `authenticated`; grant only to `service_role`. The API verifies the bearer
  token before using service role.
- `message_id` intentionally has no hard FK: the decision should survive
  conversation retention/deletion.
- `source_refs` holds citation pointers (document/chunk/url), not duplicate
  transcript text.
- Decisions are created only by an explicit user action from a message or the
  Decisions screen. There is no silent AI extraction or background
  summarization in this phase.
- Maximum tags: 10, each 40 chars; validate server-side.
- Search: `ILIKE` initially; add `pg_trgm`/FTS only after measuring.

New view for archive listing (avoids changing the admin view):

```sql
create or replace view public.pierrot_v_mobile_archive
with (security_invoker = true) as
select
  c.id, c.user_id, c.title, c.status, c.pinned,
  c.started_at, c.last_message_at, c.archived_at,
  c.consent_state, c.expires_at,
  coalesce(m.message_count, 0) as message_count,
  m.last_message_role
from public.pierrot_conversations c
left join lateral (
  select
    count(*)::bigint as message_count,
    (array_agg(pm.role order by pm.message_index desc))[1] as last_message_role
  from public.pierrot_messages pm
  where pm.conversation_id = c.id
) m on true;
```

Grant only to `service_role`; revoke from anon/authenticated.

### 8.2 Ownership and consent rules

- Archive read requires `user_id = auth.uid()`.
- Transcript is returned only if `consent_state = 'granted'`.
- Metadata (title/date/count) can be returned for pending/granted; denied
  conversations are not stored.
- Deleting a decision does not delete the conversation.
- Deleting a conversation sets `pierrot_decisions.conversation_id = null` but
  preserves the decision.
- Account deletion cascades decisions (`user_id` FK) and deletes archive rows.

### 8.3 Sync model

- Server is source of truth for signed-in users.
- SQLite remains an offline cache; no destructive merge.
- On launch/foreground: fetch first archive page; on open: fetch that
  conversation if not cached.
- Local-only conversations created before sign-in remain local unless an
  explicit “claim” action is added later. Do not silently upload them.
- Decision memory: local draft can be saved locally; when signed in, create
  server record and cache it.

---

## 9. Safe GitHub and Web Search architecture

### 9.1 GitHub

Recommended production design:

```text
iOS -> /api/mobile/github/* -> newlove server -> GitHub App installation token
                                            -> allowlisted repositories
```

- GitHub App permissions: **Metadata: read**, **Contents: read**. No issues,
  no pull requests, no writes, no webhooks.
- Credentials on server: `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`,
  `GITHUB_APP_INSTALLATION_ID`, `GITHUB_ALLOWED_REPOS`.
- Installation token cached in server memory; never returned to the device.
- Alternative for single-user prototype: fine-grained PAT with only
  `Contents: read` / `Metadata: read`, restricted to selected repos. It is
  server-only and manually rotated. Prefer GitHub App for production.
- Existing GitHub code in newlove is not a repository integration: it only
  verifies an owner token via `https://api.github.com/user` in
  `lib/knowledge/adminAuth.ts`. Do not reuse that as a user-facing proxy.

### 9.2 Web Search

- Add a provider adapter under `lib/search/` on the server.
- Recommended: Brave Search API for title/URL/snippet results; Tavily is an
  alternative if answer-oriented snippets are preferred.
- Key: `BRAVE_SEARCH_API_KEY` or `TAVILY_API_KEY`; server-only.
- No scraping of Google/Bing/DuckDuckGo. The existing
  `app/api/monitor/search/route.ts` is auction-specific and must not be
  generalized by copying its scraping approach.
- Cache normalized query results for 5 minutes; rate limit 10/min; query max
  300 chars.
- Return links/snippets only. If fetching pages later, implement SSRF guards
  (http/https only, DNS/IP checks, redirect limits, size limits).

---

## 10. Authentication plan

### 10.1 Current

Email OTP works through raw GoTrue REST. Keep it as the fallback for all
devices and for users without Apple/Google.

### 10.2 Recommended client architecture

Replace the hand-written GoTrue REST layer with
`@supabase/supabase-js` (the backend lockfile already resolves 2.118.0) and a
SecureStore auth storage adapter:

- `AuthContext` keeps the same external API used by screens.
- Supabase JS handles refresh, `signInWithIdToken`, OAuth, and passkey
  experimental APIs.
- Session remains in `expo-secure-store`; no AsyncStorage.
- `getAccessToken()` continues to feed the existing newlove bearer APIs.

This is a client dependency change, not a new backend.

### 10.3 Apple

- Install `expo-apple-authentication`.
- `app.json`: `ios.usesAppleSignIn: true`, plugin
  `expo-apple-authentication`.
- Apple Developer: App ID `love.merkurov.pierrot`, enable Sign in with Apple.
- Supabase: Apple provider enabled; add the App ID to Client IDs. Native-only
  flow does not require a Services ID or rotating `.p8` secret. If web Apple
  login is added later, a Services ID + `.p8` rotation every 6 months is
  required.
- Flow: `AppleAuthentication.signInAsync` → `identityToken` →
  `supabase.auth.signInWithIdToken({ provider:'apple', token })`.
- Apple returns full name only on first sign-in; save it with
  `updateUser({ data: { full_name, given_name, family_name } })`.
- Test on a physical device; Apple sign-in does not work in the simulator.

### 10.4 Google

- Install `@react-native-google-signin/google-signin` (native module; not Expo
  Go; requires development build).
- Create an iOS OAuth client ID for bundle `love.merkurov.pierrot` and keep the
  existing web client ID.
- Add both client IDs to the Supabase Google provider.
- Configure the reversed client ID URL scheme in `app.json` / native config.
- Flow: Google Sign-In → ID token → `supabase.auth.signInWithIdToken`.
- If the selected Google library cannot pass a nonce, enable Supabase “Skip
  nonce check” only as a documented compatibility measure; prefer nonce
  support.
- Apple sign-in must be present in the same app because Google is offered
  (App Store guideline 4.8).

### 10.5 Passkey

Status: **experimental/beta**, not a first-release blocker.

- Supabase passkeys API is available in JS SDK ≥ 2.105; backend lockfile has
  2.118.0, but the installed mobile app does not use Supabase JS yet.
- Requires Supabase project passkey enablement, RP ID, origins, and associated
  domains/AASA.
- Choose RP ID `merkurov.love` now; changing it later invalidates all passkeys.
- iOS 16+ is required. iOS needs `associatedDomains: ["webcredentials:merkurov.love"]` and an
  `https://merkurov.love/.well-known/apple-app-site-association` file with
  `webcredentials.apps: ["<TeamID>.love.merkurov.pierrot"]`.
- Supabase JS still needs a native WebAuthn ceremony on iOS. Use the documented
  two-step API (`auth.passkey.startAuthentication` /
  `verifyAuthentication`) with a native passkey Expo module. Candidate:
  `@officialunofficial/react-native-passkeys`; verify maintenance, license and
  Expo SDK 58 compatibility before adopting. `expo-passkey` found in research
  is Better Auth-specific and is not a drop-in Supabase solution.
- Do not copy the website’s `signUpWithPasskey` call; current Supabase docs use
  `registerPasskey`.
- Keep email OTP and Apple/Google as recovery paths. Never make passkey the
  only auth method in the first release.
- Acceptance gate: registration, sign-in, deletion, cross-device iCloud
  Keychain, failed/cancelled ceremony, and fallback to OTP on a physical iPad.

### 10.6 Auth UI

Settings > Account becomes the auth hub:

- Apple button (iOS only)
- Google button
- Passkey button (only when enabled and supported)
- Email code
- signed-in identity with avatar/name
- Sign out
- Delete account (App Store requirement)

---

## 11. Chat panel metrics and project status

Place the metrics at the bottom of the existing iPad `ConversationSidebar`,
above the account footer. Keep the conversation list scrollable and flexible;
the metrics must not steal the list’s space.

On iPhone, the same component appears at the bottom of the History sheet (or a
compact “Pulse” row above the composer) so the chat remains uncluttered.

### 11.1 Four compact metrics

| Display | Value | Source | Period | Refresh |
|---|---|---|---|---|
| Conversations | count | `pierrot_v_conversation_overview` | last 7 days | 5 min |
| Brain | total docs + delta | `knowledge_documents` | current + 7 days | 15 min |
| Flow | published count | `items` | last 30 days | 15 min |
| Media | published records + delta | `media_archive_records` | current + 30 days | 30 min |

Each row shows a tiny `as of`/updated time. The UI never invents numbers; if
the endpoint fails, show `—` and “unavailable”, not zero.

### 11.2 Status line

Deterministic text:

- `All clear. Last Flow item 2h ago.`
- `Attention: 2 failed Brain jobs.`
- `Attention: media queue is 3h old.`
- `Degraded: backend health check failed.`

The API returns `level`, `summary` and optional `action {label, route}`. No
LLM-generated project status.

### 11.3 Refresh policy

- On app foreground (`AppState` active) and on pull-to-refresh only.
- No `setInterval` background polling.
- Server response has `asOf` and `refreshSeconds`; mobile displays “updated Xm
  ago”.
- No server cache across users; optionally 15–30s in-memory cache for a single
  owner.

---

## 12. UI, theme and screen plan

### 12.1 Theme

- Add `ThemeProvider` with preference `'light' | 'dark' | 'system'`; default
  **light**.
- `app.json`: `userInterfaceStyle: "automatic"`, light/dark splash backgrounds.
- Light palette aligned with the site: `#FAF8F5` / `#FDFCFA` surfaces,
  `#211F1F` / `#37332D` text, `#D9D3CD` / `#E5E1DC` borders, `#990F3D`
  restrained accent.
- Dark palette keeps the current black/warm-white language.
- Add `StatusBar` dynamic style, `keyboardAppearance` dynamic, `SystemUI`
  background on change.
- Typography: add Cormorant Garamond via `@expo-google-fonts/cormorant-garamond`
  and Inter via `@expo-google-fonts/inter`, matching the site; keep system
  serif as fallback. Load with `expo-font`.
- Keep spacing/typography hierarchy; do not add gradients or card noise.

### 12.2 Identity

- Add `src/config/pierrot.ts` with the verified avatar URL.
- Chat header/empty state shows Pierrot avatar.
- Remove “Digital shadow” from `ConversationSidebar`; replace with nothing or a
  neutral label.
- Sidebar footer shows user avatar (from `me.user.image` or session metadata),
  name and email; initials fallback.
- Settings account section shows the same avatar/name.

### 12.3 Navigation

- Keep Chat, Brain, Flow, Settings in the same order and with the same custom
  bottom bar.
- Add **Dev** as a fifth tab at the end. This is additive and does not change
  the logic of the existing four. If the owner insists on exactly four tabs,
  open Dev from a Chat header action and keep the same screen.
- Media and Graph are **segments inside Brain**, not new tabs.
- Unified Search is a modal opened from Chat header/sidebar, not a tab.
- Archive is the existing History modal extended with a Decisions segment.

### 12.4 Screens

- **Chat**: existing; add light theme, user identity, message actions (copy,
  save decision, add to prompt), share conversation, compact metrics.
- **Brain**: segmented `Research | Media | Graph`; keep owner gate and URL
  intake.
- **Flow**: existing; add search integration and share.
- **Dev**:
  - Prompt composer: scope selection, task type, constraints, acceptance
    criteria, context blocks, preview, copy/share/save draft.
  - GitHub read-only browser: repos → tree → file → commits.
  - Recent decisions and prompt drafts.
- **Settings**: appearance, account, connection, privacy, integrations
  (GitHub/web search readiness), app lock, delete account, version.
- **Search** modal: query, scope chips, grouped results, recent searches.
- **History**: conversations + decisions, search, pin/rename/delete.

### 12.5 Native iOS/iPadOS capabilities

| Capability | Library / API | Priority | Notes |
|---|---|---|---|
| Share conversation/decision/prompt | `expo-sharing`, `expo-file-system` | P1 | Export Markdown/JSON; no server |
| Haptics on send/copy | `expo-haptics` | P1 | Respect Reduce Motion/settings |
| Context menu on message | long-press + native action sheet | P1 | Copy, Save decision, Add to prompt |
| Keyboard shortcuts | `Keyboard` events / hardware key handling | P2 | `⌘N` new chat, `⌘↩` send |
| iPad pointer/hover, Stage Manager | React Native pointer events + responsive layout | P2 | Keep sidebar + max widths; test split view |
| Face ID app lock | `expo-local-authentication` | P2 | Optional privacy lock; Keychain remains source |
| Document picker for Brain | `expo-document-picker` + existing admin upload | P2 | PDF/TXT; owner only |
| Push notifications | `expo-notifications` + APNs | P3 | Requires token table, server worker, opt-in |
| Widgets / App Intents | WidgetKit / App Intents extension | P3 | Native extension; not Expo Go |
| Spotlight indexing | CoreSpotlight plugin | P3 | Only if archive search needs OS-level discovery |
| Universal links / Handoff | Associated Domains + AASA + `expo-linking` | P3 | Needed for passkeys/AASA anyway |

Do not add background AI or background polling. If `expo-background-task` is
used later, it may refresh only a small cached overview, never run models or
workers.

---

## 13. Supabase migration plan

Apply only after review; use the existing manual migration workflow. Because
there is no `schema_migrations` table, verify with `information_schema` and
`pg_indexes`, and keep rollback files.

| Order | File | Purpose | Risk / rollback |
|---|---|---|---|
| 1 | `2026-11-12_mobile_conversation_archive.sql` | Add `user_id`, `title`, `pinned`, `archived_at`, `retention_days`, `summary` to `pierrot_conversations`; indexes; `pierrot_v_mobile_archive` view | Nullable additive columns; rollback drops columns/view/indexes |
| 2 | `2026-11-12_mobile_decision_memory.sql` | Create `pierrot_decisions`; RLS/no grants; indexes | New table only; rollback drops table |
| 3 | `2026-11-12_mobile_search_indexes.sql` (optional, after measurement) | Trigram/FTS indexes for `items` and `pierrot_messages` | Write amplification; measure before applying; rollback drops indexes |
| 4 | `2026-11-12_mobile_avatar_storage.sql` (optional) | `users.avatar_url`, private/public avatar bucket and policies | Only if custom upload is required; rollback drops column/policies |
| 5 | `2026-11-12_mobile_account_delete_audit.sql` (optional) | Audit table for account deletion | No user content; service-role only |

Migration rules:

- Do not modify existing RAG tables, embeddings, retention or worker schedules.
- Do not backfill private transcripts into user scope.
- Do not change public Flow/media behavior.
- `pierrot_conversations` remains service-role only; new API authenticates
  before using service role.
- Rollback files must be tested on staging first.
- `media_archive_records` is not created by a repo migration; do not assume a
  clean rebuild creates it.

---

## 14. Testing plan

### 14.1 Backend

- Unit: bearer user resolver, ownership checks, overview count logic, decision
  validation, search scope fan-out, GitHub allowlist/path validation, web
  search query normalization.
- Contract tests with fixtures for every new endpoint (200/400/401/403/404/429/
  503).
- Security tests:
  - user A cannot read user B archive/decisions;
  - anon/authenticated cannot read `pierrot_decisions` directly;
  - tampered bearer rejected;
  - GitHub repo/path allowlist bypass rejected;
  - SSRF attempts against web/page fetch blocked;
  - rate limits enforced;
  - no service/provider secret in responses.
- Integration against staging Supabase with a test owner and a test normal user.
- Existing backend test suite must stay green; no changes to `/api/pierrot-web`
  behavior except optional `user_id` attachment.

### 14.2 Mobile

- Unit: theme resolution, metric formatting, archive cursor, decision form,
  prompt template, search scope parsing, error mapping.
- Component: light/dark snapshots, avatar fallback, metric unavailable state,
  sign-in methods, archive/decisions empty states.
- E2E (Maestro/Detox) on iPhone and iPad:
  - email OTP sign-in and refresh;
  - Apple/Google sign-in once configured;
  - chat send/retry/copy/share;
  - archive fetch/open/rename/pin/delete;
  - decision save/edit/delete/search;
  - unified search scopes;
  - Dev prompt copy/share;
  - GitHub file view;
  - theme switch and relaunch persistence;
  - account deletion.
- Accessibility: VoiceOver labels, Dynamic Type, Reduce Motion, keyboard
  navigation on iPad.
- Performance: 1,000 conversations, 10,000 messages, search p95, cold start.

### 14.3 Release gates

- `npx tsc --noEmit`, `npx eslint src`, `npx expo-doctor`,
  `npx expo export --platform ios`.
- Backend `npm test`/targeted suites.
- Physical iPhone + iPad smoke test.
- TestFlight internal build; then external beta.
- No secret found in the JS bundle (`SUPABASE_SERVICE_ROLE_KEY`,
  `GEMINI_API_KEY`, `DEEPSEEK_API_KEY`, `OPENROUTER_API_KEY`,
  `ADMIN_API_SECRET`, `PIERO_API_SECRET`, GitHub/search keys).

---

## 15. EAS Build, TestFlight and App Store plan

### 15.1 Current state

- EAS project linked: `@merkurov/pierrot-ios`.
- `eas.json` profiles: development, preview, production.
- Public `EXPO_PUBLIC_*` variables are configured in EAS for all three
  environments.
- No Apple Developer credentials are configured; interactive build is blocked
  on Apple ID + 2FA.

### 15.2 Steps

1. Enroll/confirm Apple Developer Program; create App ID
   `love.merkurov.pierrot`; enable Sign in with Apple; create APNs key if push
   is in scope; enable Associated Domains for passkeys/universal links.
2. Create the App Store Connect app record; collect privacy policy URL, support
   URL, screenshots, description, keywords, age rating, export compliance.
3. Configure EAS credentials interactively:
   `npx eas-cli@latest build --platform ios --profile development`; register
   the iPad UDID when prompted.
4. Development build on device; verify native modules (Apple, Google, passkeys,
   notifications, document picker).
5. `npx eas-cli@latest build --platform ios --profile preview` for internal
   distribution; then `production` for TestFlight/App Store.
6. `npx eas-cli@latest submit --platform ios --profile production`.
7. TestFlight internal testers; fix; external beta; App Review.
8. Use `eas update` only for JS-only changes; native changes require a new
   build.

### 15.3 App Store requirements to plan for

- Sign in with Apple if Google sign-in is offered (guideline 4.8).
- Account deletion in-app (guideline 5.1.1(v)) — new endpoint + UI.
- Privacy policy and data collection disclosure (chat content, account email,
  diagnostics; web search queries if enabled; GitHub metadata).
- Export compliance: `ITSAppUsesNonExemptEncryption=false` is already set;
  confirm HTTPS-only exemption.
- No hidden admin features; owner Brain is a legitimate feature with a visible
  owner-only gate.
- Reviewer notes: account creation, owner-only Brain, no purchase flow.
- If web search sends queries to a third party, disclose it.
- If push notifications are added, explain opt-in.

---

## 16. Required credentials and manual actions

| Item | Needed for | Where it lives | Current status |
|---|---|---|---|
| Expo/EAS account | builds | EAS | Done (`@merkurov/pierrot-ios`) |
| Apple Developer Program | iOS build/TestFlight | Apple | **Missing** |
| Apple Team ID / App ID `love.merkurov.pierrot` | Apple sign-in, build | Apple + Supabase | **Missing** |
| App Store Connect API key or Apple ID app-specific password | EAS submit | EAS credentials | **Missing** |
| Sign in with Apple capability | Apple auth | Apple App ID | **Missing** |
| APNs key | push (later) | Apple + server env | **Missing** |
| AASA file on `merkurov.love` | passkeys/universal links | `/.well-known/apple-app-site-association` | **Missing** |
| Google iOS OAuth client ID | Google auth | Google Cloud + Supabase | **Missing** (web client exists) |
| Google web client ID | Supabase provider | Google Cloud + Supabase | Existing website uses Google; verify |
| Supabase Apple provider | Apple auth | Supabase dashboard | **Missing** |
| Supabase Google provider client IDs | Google auth | Supabase dashboard | Existing web config; add iOS client |
| Supabase passkey RP config | passkeys | Supabase dashboard | Not enabled/unknown (beta) |
| Supabase access token | migrations/admin | owner machine | Owner action |
| GitHub App ID/private key/installation ID or fine-grained PAT | read-only GitHub | newlove server env | **Missing** |
| GitHub repo allowlist | GitHub | newlove env | **Missing** |
| Brave/Tavily API key | web search | newlove server env | **Missing** (optional) |
| Privacy policy URL | App Store | public site | Owner action |
| App Store screenshots/metadata | App Store | App Store Connect | Owner action |

Do not place any of these in `EXPO_PUBLIC_*` or the mobile bundle. The only
public mobile values remain the API URL, site URL, Supabase URL and publishable
anon key.

---

## 17. Risks and dependencies

| Risk | Impact | Mitigation |
|---|---|---|
| Apple Developer credentials/2FA | Blocks device build, TestFlight, App Store | Interactive EAS build with owner present; do not attempt headless |
| Supabase migration history incomplete (`media_archive_records`) | New migrations may assume a clean schema | Additive/defensive SQL; verify live `information_schema`; no destructive changes |
| No `schema_migrations` | Drift between repo and production | Apply one migration at a time; record verification queries; staging first |
| Consent vs archive expectations | Users may expect server archive while consent is denied | Explicit UI: local-only when consent denied; archive requires consent |
| Passkeys beta | API/library changes; native plugin risk | Defer; keep OTP/Apple/Google; acceptance gate on device |
| Apple sign-in required with Google | App Review rejection if missing | Implement Apple before enabling Google in production |
| Account deletion missing | App Review rejection | Add endpoint + destructive UI before submitting |
| GitHub token scope | Data exposure/write risk | GitHub App read-only, repo allowlist, server-only token |
| Web search provider cost/terms | Unexpected cost or privacy issue | Server key, rate limit, cache, explicit web scope, privacy disclosure |
| Rate limits/timeouts | Chat 20/min; 60s server; 65s client | Keep retry/timeout copy; don't add hidden polling |
| No streaming | User perceives slow chat | Pending state; consider server SSE later, not client fake |
| Native Google/Apple modules | Expo Go cannot run them | Development build required; OTP remains available |
| iPad keyboard/split view | Layout regressions | Keep master/detail; test Stage Manager and keyboard |
| Bundle secret leak | Security incident | Secret scan in CI; only public envs; no provider keys in app |
| App Store privacy | Rejection | Disclose chat, account, diagnostics, web search, GitHub metadata |
| Fonts | Visual mismatch/licensing | Use Google Fonts packages with OFL; system fallback |
| Avatar metadata absent for email users | Generic identity | Initials fallback; optional avatar upload later |
| Media public search uses owner-scoped retrieval internally | Possible perceived data exposure | Verify only public records are mapped; keep public endpoint filters; do not expose owner chunks |

---

## 18. Recommended execution order and blockers

### Phase 0 — Baseline (1–2 days)

- Freeze current build; record typecheck/lint/doctor/export.
- Add `PIERROT_PRODUCT_IMPLEMENTATION_PLAN.md`.
- Decide theme preference storage, Dev navigation (5th tab vs modal), archive
  retention policy.

### Phase 1 — No-backend product shell (3–5 days)

- Light-first theme + system/dark; dynamic status bar/keyboard.
- Cormorant/Inter fonts.
- Pierrot avatar, remove “Digital Shadow”, user avatar/name.
- Preserve bottom navigation and iPad sidebar.
- Local metrics shell using Flow total, health and local conversation count.
- Local decision capture + local OpenCode prompt composer.
- Share/haptics/clipboard.
- Tests for theme/identity/prompt.

**Blockers:** none.

### Phase 2 — Backend archive + decisions + overview (1–2 weeks)

- Add `requireUserFromRequest` helper.
- Apply archive/decision migrations on staging.
- Add `/api/mobile/conversations*`, `/api/mobile/decisions*`,
  `/api/mobile/overview`, `/api/mobile/account`.
- Attach `user_id` on new authenticated conversations; title derivation.
- Mobile archive sync, decisions UI, metrics from real endpoint.
- RLS/ownership/security tests.

**Blockers:** Supabase migration access; owner approval of retention/consent
copy.

### Phase 3 — Auth providers (1 week + manual setup)

- Migrate mobile auth to `@supabase/supabase-js` + SecureStore adapter.
- Apple native sign-in (physical device).
- Google native sign-in (dev build).
- Auth UI with OTP fallback.
- Build dev client; verify token refresh and bearer APIs.
- Passkey remains disabled until Phase 6.

**Blockers:** Apple Developer credentials, Google iOS client, Supabase provider
config, dev build.

### Phase 4 — Media, Graph, unified search (1–2 weeks)

- Brain tab segments Media/Graph.
- Reuse `/api/media/search`, admin media analysis, `/api/admin/brain/graph`.
- Add `/api/mobile/search` for Brain/Media/Flow/Archive.
- Search modal; deep links; no new LLM answer.
- Rate limits/timeouts/partial results.

**Blockers:** backend endpoint; optional `pg_trgm` indexes after measurement.

### Phase 5 — Dev, GitHub, web search (1–2 weeks)

- Dev tab: prompt templates, scope picker, copy/share/save.
- GitHub read-only proxy + viewer.
- Web search provider + Web scope (optional).
- Tests and privacy copy.

**Blockers:** GitHub App/PAT; search provider key (optional).

### Phase 6 — Native polish, passkeys, TestFlight (2–4 weeks)

- Passkeys (if beta is acceptable), app lock, push notifications, widgets/App
  Intents if justified.
- App icon, splash, screenshots, privacy policy.
- TestFlight internal/external; App Review.

**Blockers:** Apple credentials, AASA, APNs, passkey library validation.

### Definition of done for the product

- Light theme default, system/dark modes, visual consistency with the site.
- User name/avatar visible after login; no “Digital Shadow” label.
- Bottom nav unchanged in logic; Dev additive.
- Chat, Brain, Media, Flow, Dev, Search, Archive, Decisions all have real
  sources or explicit unavailable states.
- Metrics show real values with source/period/update time; no invented data.
- No backend AI/RAG duplication; no secrets in the app.
- App Store account deletion, Apple sign-in, privacy policy, TestFlight build.

---

## 19. Immediate blockers (do not start mass implementation)

1. **Apple Developer / App Store Connect** credentials are missing. This blocks
   device builds, TestFlight and App Store, and Apple sign-in.
2. **Supabase archive/decision/overview migrations and read endpoints** do not
   exist. Cross-device history and real metrics cannot be shipped before them.
3. **Google iOS OAuth client** is missing; Google sign-in cannot be tested.
4. **Passkey configuration** is beta and needs a domain/AASA decision plus a
   native plugin validation. Do not make it a launch dependency.
5. **GitHub and web search credentials** are missing; those features must show
   a clean disabled state, not fake data.
6. **Account deletion** is missing and is required for App Store submission.
7. **No streaming** exists on the chat endpoint; keep a pending state or add a
   server-side stream later.

The correct next action is Phase 1: theme, identity, avatar, removal of
“Digital Shadow”, local metrics/prompt/decision foundations — all without
changing the backend. Phase 2 starts only after the owner approves the archive
retention/consent model and staging migrations.

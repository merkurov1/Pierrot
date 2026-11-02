# Pierrot iOS — Architecture & Integration Audit

Audited: 2026-11-02  
Source of truth: `merkurov1/newlove` (read-only clone at `/workspaces/newlove`)  
Mobile client: `pierrot-ios` (Expo SDK 58 / React Native 0.88 / Expo Router)

This document describes what actually exists in the newlove backend and how
the mobile client uses it. It is written from the source code, not from an
assumed API design. Live smoke checks against `https://www.merkurov.love`
were also performed for `/api/health`, `/api/flow/items`, `/api/auth/me` and
`/api/pierrot-web`.

---

## 1. Executive summary

Pierrot on the website is **not** a separate AI service. It is a Next.js App
Router route:

```text
POST /api/pierrot-web
```

It accepts JSON, runs a deterministic commercial/human-intent layer, optional
RAG, and then calls:

```text
Gemini  ->  DeepSeek direct  ->  OpenRouter DeepSeek
```

The route is a **request/response JSON endpoint**. There is no SSE endpoint and
no chunked streaming implementation for Pierrot chat. The website client posts
the full message and waits for one JSON answer.

The mobile app therefore:

- calls the real `/api/pierrot-web` route;
- does not implement its own AI orchestration, prompts, fallback or RAG;
- renders a local “thinking” state while the single JSON response is pending;
- keeps transcripts locally and sends them back as `history` (the backend has
  no public “list my conversations” endpoint);
- uses the existing Supabase email OTP for identity, then sends the Supabase
  bearer token to the existing backend for owner-scoped features.

No new backend endpoint, database, Supabase project or server secret was
created.

---

## 2. Backend map

### 2.1 Runtime and storage

- Next.js App Router (`app/api/**/route.ts`), Node runtime for Pierrot.
- Supabase is the database/auth/storage provider.
- Server-only code uses `SUPABASE_SERVICE_ROLE_KEY`.
- Browser auth uses `@supabase/ssr` cookies and the public anon key.
- Rate limiting is implemented in `lib/rateLimit.ts` and
  `lib/pierrot/rateLimit.ts`.
- Operational guardrails live in `lib/operations/*` (timeouts, circuit
  breakers, global limits).

### 2.2 Endpoint map relevant to mobile

| Endpoint | Method | Auth | What it really does | Mobile use |
|---|---|---|---|---|
| `/api/pierrot-web` | POST | Anonymous allowed; optional owner identity | Main Pierrot chat. Consent, rate limit, human takeover, commercial planner, public/owner/media RAG, LLM fallback. | **Chat** and **Brain URL intake** |
| `/api/auth/me` | GET | Supabase cookie or `Authorization: Bearer <access_token>` | Returns public user, roles, `isAdmin`. | **Account state / owner detection** |
| `/api/admin/brain/research` | POST | Admin session, verified Telegram initData, or ADMIN Supabase bearer | Owner Brain research over RAG + knowledge graph. Returns answer, citations, entities, relationships, retrieval stats, caveat. | **Brain research** |
| `/api/admin/brain/graph` | GET | Same admin gate | Knowledge graph nodes/edges/stats. | Typed client helper; UI later |
| `/api/admin/brain/preview` | POST | Same admin gate | Preview a URL/text/PDF/TXT source before ingestion. | Not used yet (URL intake goes through owner Pierrot instead) |
| `/api/admin/brain/sources` | POST | Same admin gate | Enqueue one or more Brain sources. | Not used yet |
| `/api/admin/brain/runs/*` | GET/POST | Same admin gate | Run progress, pause/resume/cancel/retry, worker loop. | Not used yet |
| `/api/admin/brain/radar` | GET | Same admin gate | Editorial radar suggestions. | Not used |
| `/api/flow/items` | GET | Public | Published public Flow items from the `items` table. `limit`, `offset`, `hasMore`, `total`, `nextOffset`. | **Flow** |
| `/api/flow` | GET | Public | Aggregated social Flow (Bluesky/Medium/YouTube Shorts), 7 newest items, link previews. | Available; not used because `/api/flow/items` is the canonical DB feed |
| `/api/flow/items` | POST | Admin | Creates a Flow item and crossposts. | Read-only mobile UI |
| `/api/health` | GET | Public | Process/database/Supabase/env health. | **Settings connection** |
| `/api/pierrot/conversations` | DELETE | Conversation id + session id | Deletes a server transcript. No GET/list. | Not used yet |
| `/api/pierrot/events` | POST | Conversation id + session id | Write-only client telemetry. No GET. | Not used |
| `/api/pierrot/human/*` | POST | Conversation credentials or human token | Human takeover state, visitor message, accept/decline/close. | Not implemented in first mobile version |
| `/api/telegram/webhook`, `/api/pierrot` | POST | Telegram webhook / internal secret | Grammy bot. Calls `/api/pierrot-web` server-to-server. | Not used by mobile |
| `/api/auth/set-cookie` | POST | Origin-checked | Sets Supabase cookies after a browser OAuth flow. | Not used; mobile uses bearer tokens |
| `/api/admin/*` (media, knowledge map, etc.) | various | Admin | Operational/admin surfaces. | Not exposed in mobile UI |

The full newlove route list is much larger. The table deliberately includes
only routes that are relevant to this first mobile release.

### 2.3 Chat contract

```http
POST /api/pierrot-web
Content-Type: application/json

{
  "message": "string, required, max 4000 chars",
  "conversationId": "8–64 chars [A-Za-z0-9_-], optional",
  "sessionId": "8–64 chars [A-Za-z0-9_-], optional",
  "userMessageId": "8–64 chars [A-Za-z0-9_-], optional",
  "consent": { "state": "pending|granted|denied", "version": "string|null" },
  "context": { "pathname": "/", "referrer": "string" },
  "history": [
    { "role": "user|assistant", "content": "string" }
  ],
  "mode": "site|unframed (optional)"
}
```

Server limits:

- 20 requests/minute per public IP; 60/minute per Telegram user for internal
  server-to-server calls.
- 4,000 characters per message (`PIERROT_MAX_MESSAGE_LENGTH`).
- 24 history items, 4,000 chars per item, 16,000 chars total.
- `maxDuration = 60` seconds on the route.

Consent semantics:

- `granted` → transcript + metadata may be stored.
- `pending` → metadata may be stored; transcript is not stored.
- `denied` → no conversation store is created.

The mobile client defaults to `denied` for Chat. The Settings screen can opt
into server transcript storage. Brain URL intake uses `pending` because the
server needs metadata storage for the URL confirmation flow; the transcript is
still not stored.

Response fields used by the app:

```json
{
  "reply": "markdown string",
  "provider": "gemini|deepseek|openrouter",
  "model": "gemini-3.5-flash",
  "latencyMs": 2117,
  "fallbackUsed": false,
  "conversationId": "…",
  "sessionId": "…",
  "userMessageId": "…",
  "assistantMessageId": "…",
  "recorded": false,
  "rag": {
    "mode": "unframed|media|public",
    "outcome": "relevant_results|unavailable|…",
    "sources": [{ "documentTitle": "…", "heading": "…", "similarity": 0.82 }]
  },
  "commercial": { "stage": "…", "offerSelected": false },
  "intent": { "name": "general_question", "confidence": 0.61 }
}
```

Error shape:

```json
{ "error": "human-readable text", "code": "RATE_LIMITED|…", "retryAfter": 12 }
```

Important server behaviours:

- **Idempotent replay**: for a stored conversation, the same
  `userMessageId` produces the same deterministic assistant id and replays the
  stored answer.
- **Human takeover**: while Anton is handling a conversation, the route returns
  HTTP `409` with `humanMode: true`. AI generation is blocked before and after
  generation, and after persistence.
- **Deterministic answers**: the commercial planner can answer without calling
  an LLM when no model is needed (`plan.useModel === false`).
- **Owner mode**: a verified owner identity turns on owner Brain retrieval by
  default. `mode: "site"` explicitly opts out. `mode: "unframed"` requires a
  verified owner and returns `403` otherwise.

### 2.4 Model fallback

`lib/pierrot/model.ts` implements a strict chain:

1. **Gemini** via `@google/generative-ai` / `lib/ai/gemini.ts`.
   Live smoke test returned `provider: "gemini"`, model
   `gemini-3.5-flash`.
2. **DeepSeek direct** (`https://api.deepseek.com`), model
   `deepseek-chat` or `deepseek-reasoner`.
3. **OpenRouter DeepSeek** (`https://openrouter.ai/api/v1`), model
   `deepseek/deepseek-chat` or `deepseek/deepseek-r1-0528`.

All providers receive the same system prompt, history, RAG context and output
format. Failures are hidden from the visitor until every fallback fails.
Circuit breakers live in `lib/operations/circuitBreaker.ts`.

### 2.5 Brain, RAG, Knowledge Graph, Media Intelligence

**Brain ingestion**

- Sources: URL, pasted text, PDF, TXT.
- URL preview → confirmation → enqueue → run/jobs → worker.
- Vector search uses OpenRouter embeddings, model `baai/bge-m3`, 1,024
  dimensions, 8,194-token context.
- Brain retrieval v2 is source-aware and hybrid (semantic + lexical). The
  provisional minimum similarity is `0.32` and is explicitly marked
  uncalibrated in `lib/knowledge/rag/config.ts`.
- Retrieval has timeouts (2.5 s default), circuit/error contracts, and
  provenance on every chunk.

**Public RAG**

- Gated by `PIERROT_PUBLIC_RAG_ENABLED`.
- Uses only documents whose `public_retrieval_allowed` flag is set.
- Never falls back to owner scope.

**Owner RAG**

- Gated by `PIERROT_RAG_ENABLED`.
- Uses `retrieveBrainEvidenceWithRefinement` when
  `PIERROT_BRAIN_RETRIEVAL_V2` is on (default true), otherwise
  `retrieveUnframedEvidence`.
- Owner access is decided server-side from the Supabase user/profile role,
  Telegram allowlist, or a verified owner credential. A client-supplied
  `mode` or admin flag is never an authorization boundary.

**Media Intelligence**

- Triggered by `isMediaArchiveQuery()`.
- Public visitors receive metadata/verified-quote evidence only.
- Owners can receive semantic media chunks.
- Prompt and source builders live in `lib/knowledge/rag/mediaEvidence.ts`.
- Admin media-record routes are separate (`/api/admin/media-records/*`,
  `/api/admin/media-quotes/*`) and are not required for mobile chat.

**Knowledge Graph**

- Graph extraction runs over Brain documents; entities and relationships are
  stored with provenance (document, chunk, evidence, confidence, inference
  flag).
- Admin endpoints: `/api/admin/brain/graph`,
  `/api/admin/brain/graph/runs/*`, `/api/admin/brain/graph/synthesize`,
  `/api/admin/brain/research`, `/api/admin/brain/radar`.
- Brain research returns graph context alongside citations.

**URL intake**

- Owner-only deterministic branch inside `/api/pierrot-web`.
- Detects a URL, normalises it, fetches a preview, stores a 30-minute pending
  candidate, and asks for confirmation.
- Confirmation triggers the same Brain ingestion pipeline.
- Mobile Brain uses this exact flow; it does not invent a second URL pipeline.

### 2.6 Flow

`GET /api/flow/items?limit=10&offset=0` is the canonical public reader feed.

- Source: Supabase `items` table.
- Filter: `status = published`, `visibility = public`, non-null
  `published_at`.
- Response:

```json
{
  "items": [
    {
      "id": "uuid",
      "title": "string|null",
      "slug": "string|null",
      "lang": "ru|en",
      "type": "note|article|link|photo|video|quote",
      "status": "published",
      "visibility": "public",
      "body_md": "markdown|null",
      "source_url": "url|null",
      "metadata": { "images": [], "link_previews": [] },
      "published_at": "ISO date",
      "bluesky_uri": "…",
      "telegram_message_id": 95
    }
  ],
  "hasMore": true,
  "total": 123,
  "nextOffset": 10
}
```

`GET /api/flow` is a separate public social aggregator (Bluesky, Medium,
YouTube Shorts) that returns seven newest items after fetching external feeds.
The mobile app uses `/api/flow/items` because it is the actual website reader
feed and supports pagination.

### 2.7 Telegram

- `app/api/telegram/webhook/route.ts` receives updates via Grammy.
- The bot (`app/api/pierrot/route.ts`) creates Telegram-specific
  `conversationId` / `sessionId` values and calls
  `/api/pierrot-web` server-to-server with `x-pierrot-internal`.
- That header is compared to `PIERO_API_SECRET` /
  `ADMIN_SECRET_KEY`; it is **not** available to the mobile client and is not
  a user identity.
- Human presence routes relay visitor messages to Anton's Telegram through the
  same bot.
- Mobile does not reuse the bot token or internal secret.

---

## 3. Authentication

### 3.1 What exists

- Supabase Auth with:
  - Google OAuth on the website;
  - email OTP (6-digit code) on `/login`;
  - passkey and wallet paths on the website;
  - cookie session using `@supabase/ssr` and `middleware.ts`.
- `/api/auth/me` supports both cookies and
  `Authorization: Bearer <supabase_access_token>`
  (`lib/supabase-server.ts` explicitly reads the bearer header).
- Admin authorization (`requireAdminFromRequest`) accepts:
  1. `x-admin-secret` (server-only secret),
  2. verified Telegram Mini App `initData` for an allowlisted user,
  3. a Supabase bearer JWT whose `users.role === 'ADMIN'`,
  4. an existing browser cookie session for an ADMIN.
- Owner-scoped Pierrot knowledge additionally uses
  `isVerifiedOwnerUser` / `isVerifiedOwnerCredential`; the shared
  `system-admin` service identity is deliberately excluded.

### 3.2 What the mobile client does

The app uses the **same Supabase project and email OTP** as the website:

```text
POST {SUPABASE_URL}/auth/v1/otp
{ "email": "...", "create_user": true }

POST {SUPABASE_URL}/auth/v1/verify
{ "type": "email", "email": "...", "token": "123456" }
```

Then:

- access/refresh tokens are stored in **expo-secure-store** (iOS Keychain),
  never AsyncStorage;
- refresh is performed against `/auth/v1/token?grant_type=refresh_token`;
- requests to `/api/auth/me`, `/api/pierrot-web` and
  `/api/admin/brain/research` carry `Authorization: Bearer <access_token>`;
- sign-out calls `/auth/v1/logout` and clears the Keychain entry.

This adds no auth endpoint and no bypass. Ordinary signed-in accounts are
recognised by `/api/auth/me`; only an ADMIN account can use Brain. A normal
account can still chat anonymously/publicly.

### 3.3 Why not cookies

Cookies are a browser transport. React Native has no cookie jar that matches
the website's `@supabase/ssr` session semantics. Sending bearer tokens to the
existing endpoints is the documented server-supported path. The mobile client
does **not** call `/api/auth/set-cookie` and does not attempt to forge a
browser session.

### 3.4 Required public configuration

Only public, bundle-safe values are used:

```bash
EXPO_PUBLIC_API_URL=https://www.merkurov.love
EXPO_PUBLIC_SITE_URL=https://www.merkurov.love
EXPO_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<publishable anon key>
```

The Supabase anon key is a publishable client credential. The app never
contains `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `DEEPSEEK_API_KEY`,
`OPENROUTER_API_KEY`, `PIERO_API_SECRET`, `ADMIN_API_SECRET`, bot tokens or
`NEXT_JWT_SECRET`.

`.env.local` is gitignored. `.env.example` documents the required public
values. A build without Supabase configuration still runs Chat and Flow; only
auth and owner Brain are disabled, and the UI says so.

---

## 4. Mobile architecture

```text
src/
  api/
    client.ts          fetch wrapper, timeouts, typed ApiError, friendly copy
    types.ts           central wire contracts
    pierrot.ts         POST /api/pierrot-web
    brain.ts           POST /api/admin/brain/research, GET /api/admin/brain/graph
    flow.ts            GET /api/flow/items
    account.ts         GET /api/auth/me
    health.ts          GET /api/health
    supabaseAuth.ts    Supabase GoTrue OTP / refresh / logout
  auth/
    AuthContext.tsx    one auth owner; secure session + consent state
  chat/
    types.ts           Conversation / ChatMessage
    storage.ts         SQLite transcript cache
    ChatContext.tsx    conversation state and persistence
  components/
    chat/              Markdown, message, composer, sidebar, typing state
    flow/              Flow card
    navigation/        custom tab bar
    ui/                Screen, header, fields, buttons, notices
  app/
    _layout.tsx        providers + root stack
    (tabs)/_layout.tsx Chat / Brain / Flow / Settings tabs
    (tabs)/index.tsx   Chat + iPad master/detail
    (tabs)/brain.tsx   Owner research + URL intake
    (tabs)/flow.tsx    Public Flow feed
    (tabs)/settings.tsx account, connection, privacy, version
    history.tsx        conversation archive modal
```

### 4.1 Separation of concerns

- **API client** is the only code that knows URLs, headers and error shapes.
- **Auth** is centralised in `AuthContext`; screens never read tokens directly.
- **Chat state** is centralised in `ChatContext`; screens do not write SQLite.
- **Markdown** is presentation only. It never calls an AI service.
- **No prompts, no model selection, no RAG, no fallback logic** exist in the
  mobile app.
- **No Supabase table access** from the client except the GoTrue auth
  endpoints. The app does not use the anon key to read profiles or knowledge
  tables.

### 4.2 Chat data flow

```text
Composer
  -> ChatContext (local conversation + SQLite)
  -> buildHistory(last 24 complete messages)
  -> POST /api/pierrot-web
       Authorization: Bearer <optional owner token>
       consent: denied | granted | pending
  -> one JSON reply
  -> update assistant message / show sanitized error
```

The server owns:
- provider choice and fallback;
- RAG retrieval;
- commercial intent;
- rate limits;
- human takeover;
- transcript retention;
- URL/Brain ingestion.

The client owns:
- message composition and local display;
- local transcript persistence;
- presentation of errors and retry;
- optional auth session.

### 4.3 Conversation history

There is no `GET /api/pierrot/conversations`. The existing route only supports
`DELETE`. The website keeps the transcript in browser state and sends it back
as `history`.

The mobile app mirrors that model:

- `Conversation` has its own `conversationId` and `sessionId` generated on the
  device with `expo-crypto.randomUUID()`;
- messages are cached in SQLite (`pierrot-conversations.db`);
- the archive modal lists local conversations;
- no transcript is downloaded from the server;
- pending messages left by an app kill are marked “interrupted” on next load.

This is why “history” in the mobile app means **local history**, not a server
account archive. A server archive would require a new authenticated read
endpoint; that is intentionally not added in this release (see `TODO.md`).

### 4.4 Responsive design

- Dark-only: `#050505` background, warm white `#F3F1EC` text, grey hierarchy,
  one restrained border colour.
- System serif for editorial headings, system sans for body, mono for labels.
- iPhone: single chat column, bottom tab bar, history modal.
- iPad (≥ 820 pt): chat gets a 292 pt conversation sidebar; Flow becomes a
  2–3 column grid; Brain/Settings stay at a readable 760–820 pt measure instead
  of stretching edge-to-edge.
- No gradients, glossy cards, neon accents or “AI” decoration.

### 4.5 Error handling

`ApiError` centralises:
- network failure;
- timeout (65 s for chat, 125 s for Brain research);
- HTTP status;
- server error code;
- `Retry-After`;
- auth expiry.

The chat keeps the user message, replaces the pending assistant row with a
readable error and a **Try again** action. Raw provider/database errors are
never shown.

### 4.6 Security posture

- Service-role key and all AI keys remain server-side.
- Owner scoping is enforced by the backend on every Brain request.
- No admin secret is embedded.
- Auth tokens: Keychain only.
- Transcripts: SQLite in the app sandbox, not AsyncStorage.
- Cleartext HTTP is not used; default backend is HTTPS.
- Links from Markdown are restricted to `http(s)`, `mailto`, and same-site
  paths before opening.
- No analytics SDK, no third-party tracking, no message content logging.

---

## 5. What is genuinely integrated vs. intentionally left as UI

### Integrated against real endpoints

- Chat: `POST /api/pierrot-web` (verified live; Gemini reply).
- Account: `GET /api/auth/me` with bearer.
- Sign-in: Supabase email OTP / refresh / logout.
- Brain research: `POST /api/admin/brain/research` (ADMIN bearer).
- Brain URL intake: owner branch of `POST /api/pierrot-web`
  (`mode: "unframed"`), preview + confirmation.
- Flow: `GET /api/flow/items` with pagination.
- Connection: `GET /api/health`.

### UI present, backend intentionally not used yet

- Flow creation / crossposting (admin POST exists; not a mobile priority).
- Brain document upload/preview/enqueue (admin endpoints exist; URL intake
  covers the first release).
- Knowledge graph visualisation (typed client helper exists; no graph canvas).
- Media Intelligence screen (chat uses it; no dedicated archive UI).
- Human takeover messaging (server routes exist; mobile shows the 409 state
  but does not implement the visitor↔Telegram transport).
- Server-side conversation archive (no read endpoint exists).

---

## 6. Build and run

```bash
cd pierrot-ios
npm install
cp .env.example .env.local   # fill public values
npx expo start              # Expo Go / development client
npx tsc --noEmit            # typecheck
npx expo export --platform ios --output-dir dist-ios
```

No local Mac or Xcode is required for development. For a device build:

```bash
npx eas-cli@latest build --platform ios --profile development
```

EAS project setup is still a TODO. Expo Go is sufficient while all native
modules used here (`expo-secure-store`, `expo-sqlite`, `expo-clipboard`,
`expo-crypto`) remain part of the Expo Go runtime.

---

## 7. Known constraints and decisions

1. **No streaming.** `/api/pierrot-web` is JSON. The mobile UI shows a pending
   state instead of faking tokens. Real streaming would require a server
   change (SSE or `ReadableStream`) and is not added.
2. **No server history read.** Conversations are local. A backend read route
   would need an authenticated ownership model and is not invented here.
3. **Brain is owner-only.** The server scopes it to ADMIN. The mobile app
   reports this honestly instead of bypassing it.
4. **Auth is optional.** Chat works as an anonymous visitor; signed-in owner
   accounts unlock Brain.
5. **The anon key is public by design.** It is not a service-role key and is
   supplied through environment variables, not committed secrets.
6. **One backend.** The app points at the production newlove deployment by
   default (`https://www.merkurov.love`) and can be pointed elsewhere with
   `EXPO_PUBLIC_API_URL`.

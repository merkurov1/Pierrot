# Pierrot for iPhone and iPad

A light-first, native Expo client for the existing Pierrot backend at
[merkurov.love](https://www.merkurov.love). The app is a client only: AI
orchestration, RAG, Brain, Media Intelligence, Flow, workers and provider keys
stay on the server.

## Current product surface

- **Chat** — real `POST /api/pierrot-web`, Markdown, citations, copy/share,
  retry with the original `userMessageId`, local SQLite cache, iOS/iPadOS
  keyboard and safe-area handling.
- **Brain** — owner research, citations, entities and relationships, owner URL
  intake, and Media/Graph-ready backend endpoints.
- **Flow** — the existing public `/api/flow/items` feed with pagination.
- **Dev** — read-only GitHub repos, file tree, source viewer, commits, diff,
  code search, decision context and OpenCode prompt history.
- **Search** — owner unified search across Brain, Media, Flow, conversations,
  decisions, GitHub and optional web search.
- **Settings** — account identity and avatar, Supabase email OTP, Google
  browser OAuth, Sign in with Apple, theme (light/system/dark), consent,
  server/local history controls, account deletion, connection health and
  version.
- **Archive** — local history plus explicit import/sync against the
  user-scoped server archive. Server transcript access remains consent-gated.

Light is the default. System and dark modes are available in Settings.
Pierrot uses the backend-owned avatar, and all navigation remains in the
existing bottom tab system; Dev is an additive fifth tab.

## Server availability

Chat (`POST /api/pierrot-web`), Flow and the owner Brain endpoints already run
on the existing `merkurov.love` server, so no backend deployment is needed for
those surfaces.

The extra `/api/mobile/*` routes are a later deployment. The app probes
`/api/mobile/overview` on launch and when it becomes active:

- if the routes exist and are protected (`401/403`), Dev, Search, Decisions,
  Project Pulse, server archive sync and account deletion are shown;
- if the routes are missing (`404`) or not ready (`5xx`), those owner-only
  surfaces are hidden instead of showing broken screens. Chat, Flow, Brain,
  theme, local history and sign-out keep working.

No rebuild is required when the server update is deployed: use
Settings → Connection → **Recheck owner tools** (or relaunch the app).


## Run

```bash
npm install
cp .env.example .env.local
# fill in the public values
npx expo start
```

Required public configuration:

```bash
EXPO_PUBLIC_API_URL=https://www.merkurov.love
EXPO_PUBLIC_SITE_URL=https://www.merkurov.love
EXPO_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<publishable anon key>
```

OAuth redirect for the mobile app must be allowed in Supabase:

```text
pierrot://auth/callback
```

In Expo Go, `Linking.createURL()` may produce an `exp://` URL instead; add that
development redirect to Supabase while testing. Apple/Google provider
configuration is documented in `ARCHITECTURE.md`.

Never put the Supabase service-role key, Gemini/DeepSeek/OpenRouter keys,
GitHub tokens, bot tokens or admin secrets in this app. Only the publishable
Supabase anon key is a client value.

## Checks

```bash
npx tsc --noEmit
npx eslint src
npx expo-doctor
npx expo export --platform ios --output-dir dist-ios
```

## Documentation

- [HOW_TO_USE.md](./HOW_TO_USE.md) — how to open and use the app in Expo Go.
- [ARCHITECTURE.md](./ARCHITECTURE.md) — backend/API map, auth, archive,
  decisions, search, Dev, native constraints and security decisions.
- [PIERROT_PRODUCT_IMPLEMENTATION_PLAN.md](./PIERROT_PRODUCT_IMPLEMENTATION_PLAN.md)
  — full product audit and phased plan.
- [TODO.md](./TODO.md) — remaining blockers and platform work.
- [APP_STORE_RELEASE_CHECKLIST.md](./APP_STORE_RELEASE_CHECKLIST.md) — release
  audit, TestFlight/App Store checklist and owner actions.
- [APP_STORE_METADATA.md](./APP_STORE_METADATA.md) — App Store copy and review
  notes draft.
- [PRIVACY_DATA_MAP.md](./PRIVACY_DATA_MAP.md) — actual data map and App Privacy
  inputs.

## Builds without a Mac

Use EAS from GitHub Codespaces or any Linux machine:

```bash
npx eas-cli@latest build --platform ios --profile preview
```

No local Xcode is required. Expo Go covers OTP and most JS-only surfaces;
Apple authentication, browser OAuth redirects, and native modules must be
verified in an internal preview build or TestFlight.

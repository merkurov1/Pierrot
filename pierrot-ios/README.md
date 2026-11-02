# Pierrot for iPhone and iPad

A minimalist Expo client for the existing Pierrot backend at
[merkurov.love](https://www.merkurov.love). The app is a client only: AI
orchestration, Gemini/DeepSeek fallback, RAG, Brain, Knowledge Graph and Media
Intelligence stay on the server.

## Screens

- **Chat** — the real `POST /api/pierrot-web` endpoint, local conversation
  history, Markdown, copy, retry, URL messages.
- **Brain** — owner-only research through `POST /api/admin/brain/research` and
  URL intake through the existing owner Pierrot URL pipeline.
- **Flow** — the public `/api/flow/items` reader feed with pagination.
- **Settings** — Supabase email-code sign-in, connection health, transcript
  consent, local data, version.

On iPad, Chat becomes a master/detail layout with a conversation sidebar and
Flow uses a multi-column grid. On iPhone, the same screens collapse to one
readable column with a bottom tab bar.

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

Only the Supabase anon key is used. Never put the service-role key, Gemini key,
DeepSeek key, OpenRouter key, bot token or admin secret in this app.

Without Supabase configuration, Chat and Flow still work; sign-in and Brain
show an explicit “not configured” state.

## Checks

```bash
npx tsc --noEmit
npx expo-doctor
npx expo export --platform ios --output-dir dist-ios
```

## Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) — audit of newlove, endpoint map, auth,
  RAG/Brain, model fallback, mobile structure and security decisions.
- [TODO.md](./TODO.md) — remaining product and platform work.

## Builds without a Mac

Use EAS from GitHub Codespaces or any Linux machine:

```bash
npx eas-cli@latest build --platform ios --profile development
```

No local Xcode is required. Expo Go is enough while the used native modules
remain part of the Expo Go runtime.

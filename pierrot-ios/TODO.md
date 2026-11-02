# Pierrot iOS — TODO

Status snapshot: 2026-11-02. Light-first mobile product with real backend
chat, owner Brain, Flow, Dev, unified search, archive import/sync, decisions,
theme switching and account controls. No EAS Build was run in this phase.

## Implemented in this phase

- [x] Light / Dark / System theme, semantic palette and persisted preference.
- [x] Backend-owned Pierrot avatar; remove “Digital Shadow”.
- [x] User name/avatar in the sidebar and Settings.
- [x] Existing bottom navigation preserved; Dev added as an additive tab.
- [x] Project Pulse with conversations/Brain/Flow/subscribers and deterministic
      status from `/api/mobile/overview`; no Visitors.
- [x] Chat share, citations, retry reusing the original `userMessageId`,
      local cache, rename/pin/delete.
- [x] Explicit local-to-server archive import and owner-scoped sync for local
      conversation IDs; consent-gated.
- [x] Dev read-only GitHub repository tree, files, commits, diff and code
      search; OpenCode prompt builder/history.
- [x] Unified search from Chat with automatic/manual sources.
- [x] Settings: theme, account, consent, local/server history, account
      deletion, privacy/support, health, version.
- [x] Email OTP, magic-link paste fallback, Google PKCE OAuth and native Sign
      in with Apple code paths.
- [x] Brain text import and basic Decision Memory UI.
- [x] `tsc`, ESLint, Expo Doctor and iOS export pass.

## P0 — blockers before TestFlight

- [x] Replace Expo template icon/splash with generated Pierrot identity assets.
- [ ] Configure Apple Developer credentials and build the first internal
      preview build interactively. The dev-client profile was removed for
      production cleanliness.
- [ ] Enable Sign in with Apple for App ID `love.merkurov.pierrot` in Apple and
      add the bundle ID to the Supabase Apple provider. Verify on a physical
      device; `expo-apple-authentication` does not work in the simulator.
- [x] Add `pierrot://auth/callback` and the current Expo Go redirect to
      Supabase Auth redirect URLs (owner-configured 2026-11-02).
- [ ] Verify Google OAuth end-to-end on a physical device and confirm that no
      token appears in a URL/log.
- [x] Add an email magic-link paste fallback that does not depend on a redirect
      and can sign in when the email template contains only a link.
- [ ] Add `{{ .Token }}` to the Supabase Magic Link template so the numeric
      Email code path always works.
- [ ] Enable/test passkeys only after a native WebAuthn plugin is validated.
      Supabase passkeys are beta and the browser WebAuthn API cannot be copied
      into React Native.
- [ ] Add privacy policy and App Store privacy answers (account email, chat,
      diagnostics, optional web search, GitHub metadata).
- [ ] Verify the Supabase email template contains `{{ .Token }}`.

## P1 — product gaps that require backend work

- [ ] **Streaming chat.** Add an SSE/`ReadableStream` contract to
      `/api/pierrot-web`; the current endpoint returns one JSON response.
      Do not fake token streaming in the client.
- [ ] **Cross-device continuation of server-only conversations.** The archive
      read API intentionally does not expose `sessionId`; an iPhone can read a
      server transcript but cannot append to it without a new owner-scoped
      continuation endpoint. Implement `POST /api/mobile/conversations/:id/message`
      (or equivalent) server-side before promising full two-device chat.
- [x] **Decision Memory UI (basic).** “Remember” on a message saves a
      user-confirmed decision; Settings → Decision memory lists/deletes entries.
- [ ] Add candidate accept/reject and full status-history UI.
- [x] **Brain text import.** Paste text → preview → explicit enqueue using the
      existing Brain pipeline.
- [ ] **Brain PDF/TXT import.** Add upload → preview → enqueue using
      `expo-document-picker` and the existing
      `/api/admin/brain/uploads|preview|sources` pipeline.
- [ ] **Brain Knowledge Graph / Media UI.** Backend endpoints exist; add a
      lightweight graph/media mode without copying the desktop admin.
- [ ] **Search filters by date/type.** Backend currently accepts query/scopes;
      add filter contract before adding UI controls.
- [ ] **Full conversation transfer to Dev.** Current Dev prompt attaches the
      active conversation and decisions, but the backend stores only the prompt
      context (last 12 messages), not a full immutable conversation snapshot.
      Add a `dev_conversation_transfers` contract if full preservation is
      required.
- [x] **Prompt result verification (basic).** Dev can show the latest diff and
      mark a prompt verified.
- [ ] Link a specific diff/commit to each prompt verification result.
- [ ] **Account deletion re-authentication.** Current endpoint requires a
      verified bearer and `confirm: "DELETE"`; add recent re-auth for stronger
      account protection.

## P2 — native capabilities not yet implemented

- [ ] iOS Share Extension for sending URL/text/PDF/files into Pierrot. The app
      can share outgoing text via the system Share sheet; inbound Share
      Extension requires a native target/config plugin and a documented
      entitlement.
- [ ] Files import and camera document capture. Requires file upload and a
      deliberate server contract; do not add a mock upload button.
- [ ] Voice input / voice conversation. Requires speech permissions and a
      verified server model/streaming contract; no second AI backend.
- [ ] Hardware keyboard shortcuts and command palette.
- [ ] Home Screen Widget for Project Pulse (WidgetKit extension; no background
      polling).
- [ ] Push notifications for important events (APNs key, device-token table and
      a server send path; opt-in only).
- [ ] Universal links beyond the `pierrot://` scheme.
- [ ] Encrypt SQLite at rest (SQLCipher or encrypted blob layer).
- [ ] Face ID app lock if transcripts are considered highly sensitive.
- [ ] Offline outbound queue for chat (currently failed messages remain visible
      and retry works, but there is no queued automatic send).
- [ ] Detox/Maestro E2E tests; unit coverage for Markdown and storage.

## Backend dependencies

- [ ] Apply the three `2026-11-12_*` migrations before using archive/decisions/
      Dev. The code returns `503 ..._not_ready` until they exist.
- [ ] Configure `GITHUB_READ_TOKEN` and `GITHUB_ALLOWED_REPOS` server-side.
- [ ] Optional `BRAVE_SEARCH_API_KEY` / `TAVILY_API_KEY`.
- [ ] Keep `PIERROT_RAG_ENABLED=true` and OpenRouter embeddings configured for
      owner Brain/Media search.

## Explicit non-goals

- No second AI backend, RAG, database or Supabase project.
- No provider/service-role keys in the app.
- No fake streaming, fake metrics or placeholder production screens.
- No GitHub writes, push, commit or merge from the app.

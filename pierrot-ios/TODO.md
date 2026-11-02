# Pierrot iOS — TODO

Status snapshot: first working Expo client, real backend chat, real Flow feed,
real owner Brain research, real owner URL intake, centralised auth and API
errors. TypeScript and iOS bundling pass.

## P0 — before calling this a build

- [ ] Replace the Expo template app icon and Android adaptive icon with a
      Pierrot mark. `assets/expo.icon` and `assets/images/icon.png` are still
      template assets.
- [x] EAS project created (`@merkurov/pierrot-ios`, ID
      `9344571a-c8d4-4737-b3b3-57c70d3ea6e5`). Public environment
      variables are configured for development/preview/production.
- [ ] Configure Apple Developer credentials and build the first iOS
      development client interactively. EAS needs the Apple ID password and
      2FA; this cannot be done headlessly.
- [ ] Verify the Supabase email template actually includes
      `{{ .Token }}`. The mobile sign-in asks for the 6-digit code, exactly like
      `/login`; if the template only sends a magic link, add the token to the
      template in the Supabase dashboard (no app change needed).
- [ ] Test sign-in, token refresh and owner Brain against the production
      Supabase project on a real iPhone and iPad.
- [ ] Confirm the URL-intake confirmation flow against a disposable URL; verify
      that `brain_url_status`, `brain_document_id` and `brain_run_id` appear.
- [ ] Add app privacy strings / App Store privacy answers: chat content,
      diagnostics, account email. No tracking SDK is used.
- [ ] Run `npx expo start` on a physical device through Expo Go or a
      development build and check keyboard behaviour on both form factors.

## P1 — highest-value product work

- [ ] **Real streaming** for Pierrot chat. This needs a backend change:
      add an SSE or `ReadableStream` variant of `/api/pierrot-web` that emits
      deltas from each provider. Do not fake token streaming in the client.
      Keep the existing JSON route for compatibility.
- [ ] **Server-side conversation archive.** Requires a new authenticated
      endpoint (for example `GET /api/pierrot/conversations` scoped to a
      Supabase user). The current route only supports `DELETE`. Until then,
      history stays local.
- [ ] **Human takeover UI.** The mobile chat already recognises HTTP 409 with
      `humanMode: true`, but does not yet send visitor messages through
      `/api/pierrot/human/message` or poll `/api/pierrot/human/state`.
      Implement only if this is a product requirement; it also needs a clear
      privacy explanation because messages are relayed to Telegram.
- [ ] **Brain ingestion on mobile.** The existing admin endpoints
      (`/api/admin/brain/preview`, `/sources`, `/runs/*`) can support direct
      URL/text/PDF/TXT intake. Current release only routes URLs through owner
      Pierrot, which is the safer default.
- [ ] **Knowledge Graph screen.** `getBrainGraph()` is already typed and
      authenticated. Add a lightweight entity/relationship explorer without
      duplicating the desktop graph canvas.
- [ ] **Media Intelligence screen.** Use existing media retrieval through
      chat first; only add a dedicated archive UI if the public media API is
      confirmed stable for mobile.
- [ ] Let the user delete the server-side transcript through the existing
      `DELETE /api/pierrot/conversations` route when server consent was enabled.
- [ ] Conversation rename and pinned conversations.
- [ ] Message-level retry that reuses the same `userMessageId` and benefits
      from the backend's idempotent replay, instead of appending a new user
      turn.

## P2 — quality and platform

- [ ] Add unit tests for Markdown parsing, API error mapping, conversation
      persistence and auth refresh.
- [ ] Add Detox or Maestro smoke tests for send-message, retry, sign-in and
      Flow pagination.
- [ ] Encrypt the local SQLite transcript at rest (SQLCipher or an encrypted
      blob layer). The current file relies on iOS app-sandbox/file-protection.
- [ ] Add Face ID / passcode gate for the app if transcripts are considered
      highly sensitive.
- [ ] Offline mode: queue outbound messages, show cached conversations and
      reattempt when the connection returns.
- [ ] Push notifications for human takeover or long-running Brain ingestion.
- [ ] Deep links: `pierrot://flow/<slug>` and `pierrot://brain`.
- [ ] Share sheet / file import for Brain sources.
- [ ] Accessibility pass: Dynamic Type, VoiceOver labels for Markdown links,
      focus order in the composer, Reduce Motion.
- [ ] Localisation (EN/RU) for the interface. The backend already detects the
      message language and answers in it.
- [ ] iPad pointer/keyboard affordances and hardware keyboard shortcuts
      (`⌘N` new conversation, `⌘↩` send).
- [ ] Add a custom splash mark; the current splash is a black field only.
- [ ] Add a subtle message-arrival animation, respecting Reduce Motion.
- [ ] Verify rate-limit copy when several devices share one NAT/IP.

## Backend-dependent, do not implement client-side

- [ ] Streaming chat (requires server SSE/stream contract).
- [ ] Reading server transcripts (requires an authenticated GET route).
- [ ] Public Brain search (currently owner-only via admin gate).
- [ ] Cross-device conversation sync (requires server archive + user scope).
- [ ] Media/Graph write operations (admin-only by design).

## Explicit non-goals for this release

- Reimplementing Gemini/DeepSeek fallback in the app.
- Embedding provider keys or a Supabase service-role key.
- Creating a second Supabase project or database.
- Copying the website's server-side commercial prompt or RAG pipeline into
  React Native.
- Building the full admin surface on mobile.
- Replacing the website's auth model with a custom token scheme.

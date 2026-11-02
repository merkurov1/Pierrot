# Pierrot iOS — Privacy & Data Map

This map is based on the actual client and backend code. It is not a substitute
for the final App Store privacy answers; the owner must confirm every label.

## Data inventory

| Data | Collected by | Where it lives | Linked to user | Purpose | Retention / deletion |
|---|---|---|---|---|---|
| Email address | Supabase Auth (site and app) | Supabase auth/users; mobile session metadata | Yes | Sign-in, account management | Until account deletion; Supabase policy |
| User ID (UUID) | Supabase Auth | Supabase auth/users; server archive/decisions/prompts | Yes | Ownership/scoping | Until account deletion |
| Name/avatar | Supabase user metadata, `/api/auth/me` | Supabase auth metadata; displayed on device | Yes | Profile display | Until metadata/account deletion |
| Chat messages | User input in Chat | Local SQLite; server `pierrot_messages` only when consent granted | Yes | Chat, history, RAG | Local until cleared; server 90-day default retention |
| Chat events/usage | Backend | `pierrot_events`/analytics views, if consent allows metadata | Yes, via conversation/session | Product operation and owner analytics | 90-day conversation retention; server policy |
| Decision Memory | Explicit user “Remember” action | `pierrot_decisions`, `pierrot_decision_events` | Yes | Remember decisions/positions/constraints | Until user deletes or account deletion |
| Brain documents | Owner URL/text import | `knowledge_documents`, `knowledge_chunks` | Owner/private, not public by default | Owner RAG/research | Server policy; owner-managed |
| Brain URLs/text | Owner action | Brain storage/database | Owner | Ingestion and retrieval | Server policy |
| GitHub metadata/files | Server GitHub proxy | Server response; optionally prompt history | Owner/developer data | Read-only Dev context | Server cache 60s; prompt history until deletion |
| GitHub token | Server env only | Never on device | N/A | Server GitHub API auth | Server credential rotation |
| Web search query | Owner-only Search | Server request to Brave/Tavily if configured | Yes, if provider logs it | External search | Provider policy; server cache 5 min |
| AI prompts/content | Server | Sent to Gemini/DeepSeek/OpenRouter during generation | Yes, through backend | Generate answers | Provider policy; server transcript only with consent |
| Diagnostics | Backend logs | Server logs (error type/code; no message text by design) | Not intentionally | Reliability/security | Server log policy |
| Local transcript cache | App | SQLite sandbox file | Yes | Offline/local history | User clears or uninstalls; not encrypted by SQLCipher |
| Auth tokens | App | iOS Keychain via `expo-secure-store` | Yes | Session refresh | Deleted on sign-out/account deletion |
| Theme preference | App | SecureStore | No | UI preference | Until app data removal |
| Consent preference | App | SecureStore | No | Remember transcript choice | Until app data removal |

## Explicitly not collected by the mobile app

- No advertising identifier (IDFA).
- No location data.
- No contacts, photos, camera or microphone data (features are not implemented).
- No mobile analytics or crash-reporting SDK.
- No GitHub token, Supabase service-role key, or AI provider key on device.
- No visitors/web analytics metric is displayed; the backend has no verified
  visitor source.

## Third-party transfers

| Recipient | Data | Trigger | Notes |
|---|---|---|---|
| Supabase Auth | Email, session, user metadata | Sign-in/refresh | Same project as the website |
| Gemini / DeepSeek / OpenRouter | Prompt, conversation context, RAG evidence | Chat/Brain/Media request | Server-side only; no provider keys on device |
| Brave Search or Tavily | Search query | Owner uses Web search scope | Optional; only if configured |
| GitHub | Repository/read requests | Owner opens Dev | Server-side token; no token on device |
| Vercel/Supabase hosting | Request metadata and stored server data | All backend use | Server/ops providers |

## App Privacy label recommendation

Use the owner’s final privacy policy and Apple’s definitions. A defensible draft:

- Contact Info: Email Address — linked, app functionality.
- Identifiers: User ID — linked, app functionality.
- User Content: Other User Content — linked, app functionality.
- Usage Data: Product Interaction — linked, app functionality/analytics if the
  owner confirms server analytics are part of the shipped service.
- Diagnostics: only if server diagnostics are exposed as collected diagnostics;
  the mobile app has no diagnostics SDK.
- Tracking: **No**.

## Deletion paths

- Local chat: Settings → Clear local conversations.
- Server chat archive: Settings → Delete server history (owner-scoped).
- Decision Memory: Decisions screen → Delete.
- Account + auth + user-owned server data: Settings → Delete account
  (`DELETE /api/mobile/account`, `confirm: "DELETE"`).
- Brain documents: owner-managed server data; no mobile delete UI yet.

## Open privacy blockers

- No published privacy policy URL.
- No published support URL.
- App Privacy answers are not entered in App Store Connect.
- Local SQLite is not SQLCipher-encrypted.
- AI/search provider data-processing terms must be confirmed by the owner.
- If camera/voice/files are added later, new Info.plist purpose strings and
  privacy disclosures are required before shipping.

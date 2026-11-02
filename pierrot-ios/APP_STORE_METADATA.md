# Pierrot — App Store Metadata Draft

Status: draft, not submitted. Replace every `NEEDS_OWNER` before submission and
do not put credentials in this repository.

## App information

| Field | Value |
|---|---|
| App name | **Pierrot** |
| Subtitle | **Personal intelligence** |
| Bundle ID | `love.merkurov.pierrot` |
| Primary language | English (owner must confirm; UI is English, replies follow message language) |
| Primary category | Productivity |
| Secondary category | Lifestyle (owner confirmation) |
| Age rating | Provisional **17+** (AI-generated chat + external web results); owner must complete Apple's questionnaire |
| Copyright | `© 2026 Anton Merkurov` (owner confirmation) |
| Version | `1.0.0` |
| Build | Assigned by EAS production `autoIncrement` |

## Promotional text

> A quiet, personal interface to Pierrot: conversation, memory, Brain research,
> Flow, media, search and a read-only development workspace.

## Description draft

> Pierrot is a personal intelligence interface for the work and archive of Anton
> Merkurov.
>
> Ask a question, think through a decision, send a link, search the private
> archive or open the Flow stream. Pierrot keeps the same server-side identity,
> retrieval and model routing as merkurov.love; the app is a focused client, not
> a separate AI system.
>
> The owner workspace adds Brain research with citations, Decision Memory,
> read-only GitHub repository context, OpenCode prompt preparation and a unified
> search across saved and external sources.
>
> Chat and Flow are available without an account. Sign in with the existing
> Supabase account to sync the owner workspace. Server transcript storage is
> opt-in; local transcripts remain on the device unless explicitly imported.
>
> Pierrot is intentionally restrained: light-first, typographic, and free of
> dashboards, feeds and engagement mechanics.

## Keywords

```text
Pierrot,AI,assistant,art,archive,Brain,research,Flow,GitHub,search,personal
```

Keywords are provisional and should be checked against the 100-character limit
and current App Store search competition.

## URLs

| Field | Value |
|---|---|
| Privacy Policy URL | `NEEDS_OWNER` — publish a real policy before submission |
| Support URL | `NEEDS_OWNER` — publish a real support/contact page |
| Marketing URL | `https://www.merkurov.love` (owner confirmation) |
| EULA | Apple Standard EULA unless owner supplies a custom one |

## App Privacy disclosure draft

Use this as input to App Store Connect, not as an automatic answer.

- **Contact Info → Email Address**: collected, linked, app functionality and
  account management.
- **Identifiers → User ID**: collected, linked, app functionality.
- **User Content → Other User Content**: chat messages and owner Brain content,
  linked, app functionality. Server storage is opt-in; AI providers receive
  content through the backend when a message is sent.
- **Usage Data → Product Interaction**: server-side Pierrot events if transcript
  consent is granted; app functionality/analytics. Confirm with the owner
  whether this is declared in the final App Privacy label.
- **Diagnostics**: backend error logs contain error codes/type, not message
  content; no mobile crash/analytics SDK is installed.
- **Tracking**: no; no IDFA, no advertising SDK, no tracking domains.
- **GitHub**: repository metadata/files are developer-owned and fetched through
  the server proxy; no GitHub token is present on the device.
- **Web search**: optional owner-only query is sent to Brave or Tavily when
  configured; disclose if enabled in the submitted build.

## Screenshots

Required sets (not fabricated):

1. iPhone 6.9" (current App Store requirement).
2. iPad 13" (the app supports iPad).

Suggested frames:

- Chat empty state with Pierrot identity.
- Chat with citations and copy/share.
- Project Pulse + status in the iPad sidebar.
- Brain research with sources.
- Dev repository/prompt view.
- Unified Search grouped results.
- Settings showing theme and privacy controls.

Capture from real iPhone/iPad after the backend endpoints are deployed. Do not
use simulator-only screenshots as evidence of device testing.

## Review notes draft

```text
Pierrot is a client for the existing merkurov.love backend.

Chat and the public Flow feed are usable without an account. Owner-only areas
(Brain research, Dev, unified Search and Project Pulse) require a Supabase
account with ADMIN role on the existing project. The app does not include
provider keys, a service-role key, GitHub tokens, or a second AI backend.

Sign in options: Email one-time code, Google, and Sign in with Apple. Apple
sign-in is available wherever Google is offered. The app provides in-app
account deletion and local/server history controls.

No in-app purchases or subscriptions are offered in this version. External
links open in the system browser.
```

If the reviewer needs owner features, enter the reviewer account only in App
Store Connect's review notes. Do not commit credentials or send 2FA codes.

## Guideline checks

- **4.8**: Google is offered; Sign in with Apple is present in the app and must
  be enabled in the submitted build.
- **5.1.1(v)**: account deletion is available in Settings; confirm the endpoint
  deletes auth and user data.
- **5.1.2**: consent for server transcript storage; AI/search provider transfer
  described in the privacy policy.
- **2.1**: no placeholder buttons are advertised. Passkey, inbound Share
  Extension, camera, voice, widgets and push are not presented as working
  features in this build.
- **2.3**: screenshots and description must match the shipped build.

## Before submission

- [ ] Replace all `NEEDS_OWNER` values.
- [ ] Publish privacy policy and support page.
- [ ] Complete App Privacy answers from `PRIVACY_DATA_MAP.md`.
- [ ] Capture real-device screenshots.
- [ ] Verify Google and Apple sign-in on a physical device.
- [ ] Verify account deletion end-to-end.
- [ ] Verify the backend mobile endpoints are deployed and migrations applied.

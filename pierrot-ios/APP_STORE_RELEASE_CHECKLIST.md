# Pierrot iOS — App Store Release Checklist

Audit date: 2026-11-02
Scope: `merkurov1/Pierrot` mobile app + `merkurov1/newlove` backend
No EAS production build, TestFlight upload or App Store submission was run in
this phase.

Status vocabulary:

- **verified** — checked against code/config or a live endpoint in this audit.
- **needs owner action** — requires Apple/Supabase/GitHub/App Store owner action.
- **blocked** — cannot be completed with the current deployment or missing contract.
- **not applicable** — deliberately out of scope for this release.

---

## A. Code readiness

| Item | Status | Evidence / action |
|---|---|---|
| Bundle identifier `love.merkurov.pierrot` | verified | `app.json`; generated Xcode settings confirmed `PRODUCT_BUNDLE_IDENTIFIER = love.merkurov.pierrot`. |
| App name `Pierrot` | verified | `app.json`; generated `CFBundleDisplayName=Pierrot`. |
| Slug `pierrot-ios` | verified | Matches EAS project `@merkurov/pierrot-ios`; do not rename without an EAS project migration. |
| Version/build number | verified | `1.0.0` / `1`; production profile uses remote `appVersionSource` and autoIncrement. |
| iOS deployment target | verified | Explicit `ios.deploymentTarget: "16.0"`; generated project uses 16.0. |
| Expo SDK/native compatibility | verified | Expo 58.0.22, RN 0.88.1; `expo-doctor` 20/20; `tsc` and ESLint pass. |
| EAS project and profiles | verified | Project ID `9344571a-c8d4-4737-b3b3-57c70d3ea6e5`; preview internal + production store profiles. No builds exist yet. |
| App icon / splash | verified | Replaced Expo template assets with backend-owned Pierrot portrait; 1024×1024 icon, 512×512 splash, adaptive icons. |
| Remaining Expo template assets | verified | Removed Expo badge/logo/react/tab/tutorial assets and `assets/expo.icon`. |
| Deep link scheme | verified (config) | `scheme: "pierrot"`; routes `/search`, `/dev`, `/decisions`, `/history` exist in typed route output. Device launch not yet tested. |
| OAuth redirect URL | verified (owner config) | Owner added `pierrot://auth/callback` and the current Expo Go redirect on 2026-11-02. Re-check after changing the tunnel URL. Device OAuth return still needs a physical test. |
| Entitlements | verified (generated) | Prebuild generated `com.apple.developer.applesignin`. No push/iCloud/associated-domain entitlement is present. |
| Privacy manifest | verified (baseline) | Generated `PrivacyInfo.xcprivacy` with tracking false and no tracking domains. App Privacy labels still need owner confirmation. |
| Info.plist usage descriptions | verified (generated) | `NSFaceIDUsageDescription` is supplied by `expo-secure-store`; no camera/mic/photos API is currently used. Remove or add descriptions only when the corresponding feature is implemented. |
| SecureStore/Keychain | verified (code) | Auth tokens use `expo-secure-store`; no AsyncStorage token storage. |
| Localization | needs owner action | UI is English-only; backend replies follow the message language. App Store primary language must be chosen. |
| Production API availability | blocked | `/api/health` and `/api/flow/items` return 200, but `/api/mobile/overview`, `/api/mobile/conversations`, `/api/mobile/search` return 404 because the new backend code is not deployed. |
| OTA updates (`expo-updates`) | not applicable | Package is not installed and no channel/runtimeVersion is configured. A new native build is required for changes; do not add OTA until channels/runtimeVersion are deliberately configured. |

---

## B. Backend readiness

| Item | Status | Evidence / action |
|---|---|---|
| Mobile archive migration | blocked | `2026-11-12_pierrot_mobile_archive.sql` is not applied. |
| Decision Memory migration | blocked | `2026-11-12_pierrot_decision_memory.sql` is not applied. |
| Dev workspace migration | blocked | `2026-11-12_pierrot_dev_workspace.sql` is not applied. |
| Newlove code deployment | blocked | Mobile endpoints are 404 on production; deploy the backend changes first. |
| Consent semantics | verified (code/tests) | Server archive only returns messages when `consent_state=granted`; import requires explicit consent. Backend tests pass. |
| User scoping | verified (code/tests) | Archive/decisions/Dev queries are user-scoped; backend tests cover owner/user separation. |
| Owner-only Brain/Dev/Search/Overview | verified (code) | `requireMobileOwner` checks `users.role=ADMIN`; mobile only gates UI, server is authoritative. |
| GitHub read-only | needs owner action | Server code exists; `GITHUB_READ_TOKEN` and `GITHUB_ALLOWED_REPOS` are not configured. No token is in the app. |
| Web search | needs owner action | Optional `BRAVE_SEARCH_API_KEY` or `TAVILY_API_KEY` is not configured; scope returns `503` until then. |
| RAG/embeddings | needs owner action | `PIERROT_RAG_ENABLED=true` and `OPENROUTER_API_KEY` must be present for owner Brain/Media search. |
| Rate limits/timeouts | verified (code/tests) | Each mobile route has fixed-window limits and bounded timeouts; targeted tests pass. |
| No new cron/worker | verified | No cron, worker or background AI was added. |

---

## C. Authentication

| Item | Status | Evidence / action |
|---|---|---|
| Email OTP | needs owner action | Existing Supabase GoTrue flow. Add `{{ .Token }}` to the Magic Link template, or use the in-app magic-link paste fallback. Test both on a physical device. |
| Google PKCE OAuth | needs owner action | Mobile PKCE code exists and redirect URLs are configured; confirm the Supabase Google provider and test the browser return on a physical device. |
| Sign in with Apple | needs owner action | `expo-apple-authentication` + Supabase ID-token code exists; Apple App ID/capability and Supabase Apple provider must be configured. Test on a physical device (not simulator). |
| Passkey | blocked | Supabase Passkeys are beta; no verified native WebAuthn plugin is installed. Do not ship browser WebAuthn in RN. |
| Apple sign-in availability for Guideline 4.8 | needs owner action | The app offers Google login, so Apple login must be enabled before submission. The native button/code is present. |
| Session persistence | verified (code) | SecureStore session, refresh and logout paths; not yet tested after a physical relaunch. |
| Token exposure | verified (code) | OAuth uses PKCE code exchange; access/refresh tokens are not placed in URLs or logs. |
| Account creation/deletion | verified (code) / needs owner action | `/api/mobile/account` deletes user data and auth user; app has a typed-confirmation flow. Endpoint is not deployed yet. |

---

## D. Privacy and security

| Item | Status | Evidence / action |
|---|---|---|
| Service-role key in app/bundle | verified | Not present in source or exported bundle. |
| Gemini/DeepSeek/OpenRouter keys in app | verified | Not present; all provider calls are backend-only. |
| GitHub token on device | verified | Token is read only from server env; mobile proxy never returns it. |
| Auth/session storage | verified (code) | expo-secure-store/Keychain. |
| Local transcript storage | verified / needs owner decision | SQLite in app sandbox, not AsyncStorage; not SQLCipher-encrypted. Document this in privacy policy. |
| Server transcript storage | verified (code) | Opt-in consent; default denied for chat. |
| Account/data deletion | verified (code) / blocked deployment | UI and endpoint exist; backend not deployed. |
| App Privacy data map | needs owner action | See `PRIVACY_DATA_MAP.md`; App Store Connect labels must be completed by the owner. |
| Privacy policy URL | blocked | No verified policy URL exists in the repo. Must be published and entered in App Store Connect. |
| Support URL | blocked | No verified support page/contact URL exists. |
| Tracking/IDFA | verified | No tracking SDK, no IDFA, no NSPrivacyTracking. |
| AI provider disclosure | needs owner action | Chat/Brain content is sent to Gemini/DeepSeek/OpenRouter via backend; disclose in privacy policy and App Privacy. |
| Web search provider disclosure | needs owner action | If enabled, queries go to Brave/Tavily; disclose accordingly. |
| Debug credentials | verified | No debug credentials in source; `.env.local` is gitignored. |

---

## E. Device testing

Every item below requires an owner-driven physical-device session; simulator-only
testing is not sufficient.

| Item | Status | Required check |
|---|---|---|
| iPhone first launch | needs owner action | Light default, safe areas, Dynamic Type, keyboard, VoiceOver. |
| iPad first launch | needs owner action | Sidebar, Split View, Stage Manager, wide window, orientation changes. |
| Email OTP | needs owner action | Code delivery, verify, magic-link paste fallback, refresh, relaunch, sign out. |
| Google OAuth | needs owner action | PKCE browser return, no token in URL/log. |
| Apple sign-in | needs owner action | First-sign-in name capture, relaunch, sign out. |
| Passkey | blocked | Not enabled. |
| Chat | needs owner action | Send, Markdown, citations, copy, share, retry, offline, long messages. |
| Archive | needs owner action | Local import, consent, server sync, rename/pin/delete, second device read. |
| Dev/Brain/Search/Flow | needs owner action | After backend deployment and migrations. |
| Share sheet | needs owner action | Outgoing text. Inbound Share Extension is blocked/not implemented. |
| Files/camera/voice | blocked | Not implemented; no mock controls. |
| Account deletion | needs owner action | Verify server and local data disappear. |
| Network failure | needs owner action | Airplane mode, timeout, retry, draft preservation. |

---

## F. EAS Build

| Item | Status | Evidence / action |
|---|---|---|
| EAS login | verified | Logged in as `merkurov`; project linked. |
| EAS profiles | verified | `eas.json` has preview/internal and production/store; production autoIncrement. |
| Expo Doctor | verified | 20/20. |
| Native prebuild | verified | Prebuild generated deployment target 16.0, Apple sign-in entitlement, privacy manifest. Generated `ios/` was inspected and removed; do not commit it. |
| Apple credentials | needs owner action | No production build profile has been used; Apple ID/2FA and App Store Connect API key are required interactively. |
| Build quota | verified strategy | No intermediate builds were started; only one final production build should be run after blockers are cleared. |
| Production build | blocked | Backend endpoints 404 and migrations absent. Do not spend build quota yet. |
| Build link | not available | No build exists. |

---

## G. TestFlight

| Item | Status | Required action |
|---|---|---|
| Production build uploaded | blocked | Depends on EAS build + Apple credentials. |
| Internal testers | needs owner action | Create App Store Connect app and internal tester group. |
| TestFlight test plan | needs owner action | Use section E scenarios; do not mark passed from simulator. |
| Build processing | not started | Check App Store Connect after upload. |
| Export compliance | verified (config) | `ITSAppUsesNonExemptEncryption=false`; confirm at upload. |
| Beta App Review | not started | Required for external testers. |

---

## H. App Store Connect

| Item | Status | Required action |
|---|---|---|
| App record | needs owner action | Create app with bundle `love.merkurov.pierrot`. |
| Agreements/tax/banking | needs owner action | Complete App Store Connect agreements. |
| Name/subtitle/description | needs owner action | Draft in `APP_STORE_METADATA.md`. |
| Keywords/categories | needs owner action | Draft in `APP_STORE_METADATA.md`; confirm category. |
| Age rating | needs owner action | Questionnaire; provisional 17+ because of AI chat and external web results. |
| Privacy policy URL | blocked | Publish a policy and enter its URL. |
| Support URL | blocked | Publish a support/contact URL. |
| App Privacy answers | needs owner action | Complete from `PRIVACY_DATA_MAP.md`. |
| Screenshots | needs owner action | Required iPhone 6.9" and iPad 13" sets; capture from real devices. |
| Review notes / demo account | needs owner action | Provide a reviewer account or document that Chat/Flow work without an account. Never put credentials in the repo. |
| Guideline 4.8 | needs owner action | Enable Sign in with Apple because Google is offered. |
| Guideline 5.1.1(v) | verified (code) / needs owner action | Account deletion exists; test it before review. |

---

## I. App Review

| Item | Status | Notes |
|---|---|---|
| All links work | needs owner action | Privacy, support and site links must be live. |
| Backend reachable for reviewer | blocked | `/api/mobile/*` must be deployed. |
| No placeholder screens | blocked | Passkey, inbound share extension, camera/voice, widgets/push are not advertised; they are not fake buttons. Dev/Brain/Search must be live. |
| Demo/reviewer mode | needs owner action | Owner must provide reviewer account details privately in App Store Connect if owner features are needed. |
| Submit for Review | needs owner action | Owner must sign agreements and press Submit. |
| Release | needs owner action | Do not claim publication before App Store status is `Ready for Distribution`. |

---

## J. Post-release monitoring

| Item | Status | Plan |
|---|---|---|
| EAS build monitoring | needs owner action | Watch EAS build/TestFlight processing; keep the build URL. |
| App Store status | needs owner action | Track `Processing → Ready for Sale`. |
| Backend health | verified (health endpoint) | Monitor `/api/health`; deploy mobile endpoints before release. |
| Error monitoring | needs owner action | Define Sentry/backend log ownership; no mobile analytics SDK is present. |
| Privacy/deletion requests | needs owner action | Document support process for account/data deletion. |
| OTA policy | not applicable | No `expo-updates`; every JS/native change needs a new build until channels/runtimeVersion are configured. |
| Rollback | needs owner action | Keep the previous TestFlight build; server migrations are additive and must not be destructively rolled back. |

### Update procedure after publication

1. Deploy backend changes to newlove first and verify `/api/health` plus every
   `/api/mobile/*` route used by the app.
2. Apply only additive Supabase migrations; verify with `information_schema` and
   `pg_indexes`. Do not destructively roll back conversation/decision data.
3. Run `npx tsc --noEmit`, `npx eslint src`, `npx expo-doctor` and
   `npx expo export --platform ios`.
4. Increment the app version/build through EAS remote versioning, then create
   one new production build.
5. Test the build in internal TestFlight on iPhone and iPad.
6. Submit the same tested build for App Review; do not ship an untested binary.
7. If EAS Update is introduced later, define channels and a runtimeVersion that
   matches each native binary before sending any update. Never send an OTA
   bundle to an incompatible binary.
8. Keep the previous build available for rollback; the server must remain
   backward-compatible with the previous released client for the transition
   window.

---

## Release decision

**Not ready for EAS production build or TestFlight.** The local app code passes
TypeScript, ESLint, Expo Doctor and iOS export, and the icon/splash/config are
release-shaped. The blocking facts are:

1. newlove mobile endpoints are not deployed (404 in production);
2. the three migrations are not applied;
3. Apple/Google OAuth provider configuration and Apple credentials are absent;
4. Passkey is not implemented;
5. privacy policy/support URLs and App Store privacy answers are missing;
6. physical iPhone/iPad testing has not happened.

The next valid step is owner/backend preparation (see the owner actions), not
spending EAS build quota.

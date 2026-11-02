# Pierrot

Personal assistant iOS app — a native Expo client for the existing
[merkurov.love](https://www.merkurov.love) backend.

The app lives in [`pierrot-ios/`](./pierrot-ios). Chat, RAG, Brain, Flow,
workers, model routing and all provider keys stay in the separate `newlove`
backend repository; this repository contains only the mobile client.

## Quick start

```bash
cd pierrot-ios
npm install
cp .env.example .env.local
# fill in the public EXPO_PUBLIC_* values
npx expo start
```

Open the printed URL in Expo Go on iPhone/iPad.

## Checks

```bash
cd pierrot-ios
npx tsc --noEmit
npx eslint src
npx expo-doctor
npx expo export --platform ios --output-dir dist-ios
```

## Build

```bash
cd pierrot-ios
npx eas-cli@latest build --platform ios --profile preview
# after physical-device testing:
npx eas-cli@latest build --platform ios --profile production
```

Apple ID/2FA and App Store Connect access are required interactively for the
first build. Do not commit credentials.

## Documentation

- [`pierrot-ios/README.md`](./pierrot-ios/README.md)
- [`pierrot-ios/ARCHITECTURE.md`](./pierrot-ios/ARCHITECTURE.md)
- [`pierrot-ios/TODO.md`](./pierrot-ios/TODO.md)
- [`pierrot-ios/APP_STORE_RELEASE_CHECKLIST.md`](./pierrot-ios/APP_STORE_RELEASE_CHECKLIST.md)
- [`pierrot-ios/APP_STORE_METADATA.md`](./pierrot-ios/APP_STORE_METADATA.md)
- [`pierrot-ios/PRIVACY_DATA_MAP.md`](./pierrot-ios/PRIVACY_DATA_MAP.md)

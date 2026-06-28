# Build Guide

## Local Validation

```bash
npm install
npx tsc --noEmit
npm run backend:build
npx expo export --platform web
```

## Backend

Development:

```bash
set HEALTHY_YOU_BACKEND_ENV=backend/.env.development
npm run backend:build
npm run backend:start
```

Production-like validation:

```bash
set HEALTHY_YOU_BACKEND_ENV=backend/.env.production.local
npm run backend:build
npm run backend:start
```

## EAS Android

Preview APK:

```bash
npm run build:android:preview
```

Production Android build:

```bash
npm run build:android:production
```

EAS requires an Expo account, project configuration, and remote build credentials. Do not store signing credentials in the repository.

## iOS

The `eas.json` file includes future iOS support. iOS production submission still requires Apple Developer account setup and signing credentials.

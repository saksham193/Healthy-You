# Sprint 18.5 Release Checklist

Date: 2026-06-24
Scope: Release certification checklist.

## Required Local Checks

| Item | Status | Notes |
| --- | --- | --- |
| Install dependencies | Pass | `npm install` completed in 27.2s |
| Backend build | Pass | `npm run backend:build` completed in 8.6s |
| TypeScript check | Pass | `npx tsc --noEmit` completed in 7.9s |
| Web export | Pass | `npx expo export --platform web` completed in 25.4s |
| AI quality validation | Pass | Synthetic checks passed; live OpenAI skipped because `OPENAI_API_KEY` is absent |
| Offline intelligence validation | Pass | Offline harness passed |
| Medical RAG validation | Pass | RAG harness passed |
| Medical RAG hardening validation | Pass | Hardening harness passed; live OpenAI skipped because `OPENAI_API_KEY` is absent |
| Multi-agent validation | Pass | Agent harness passed; live OpenAI skipped because `OPENAI_API_KEY` is absent |
| Predictive health validation | Pass | Prediction harness passed; live OpenAI skipped because `OPENAI_API_KEY` is absent |

## Required Native Readiness Checks

| Item | Status | Notes |
| --- | --- | --- |
| App config reviewed | Pass | `app.json` reviewed |
| EAS config reviewed | Pass | `eas.json` reviewed |
| Android Health Connect config reviewed | Pass | Introspection confirms health permissions, Health Connect package query, rationale action, and permission usage alias |
| iOS HealthKit config reviewed | Pass | Introspection confirms usage description and HealthKit entitlement |
| Expo dev client config reviewed | Pass | `expo-dev-client` present and EAS development profile uses `developmentClient: true` |
| Bundle identifiers reviewed | Pass | Android package and iOS bundle ID are `com.healthyyou.app` |
| Environment variable templates reviewed | Pass | `.env.*` files contain expected public environment keys |
| EAS CLI available | Pass | `eas-cli/20.3.0` |
| Expo introspection available | Pass | `npx expo config --type introspect --json` completed |
| Expo/EAS login | Blocked | `eas whoami` reports `Not logged in` |
| Android SDK available | Blocked | `ANDROID_HOME` and `ANDROID_SDK_ROOT` are unset |
| ADB available | Blocked | `adb` is not on PATH |
| iOS credentials available | Blocked | Requires EAS login/Apple credential access; not validated |

## Required Manual Device Checks

| Item | Status | Notes |
| --- | --- | --- |
| Android physical device validation | Blocked | Real device and install path required |
| iPhone physical device validation | Blocked | Real iPhone and install path required |
| Health Connect validation | Blocked | Real Android device required |
| Apple Health validation | Blocked | Real iPhone required |
| Airplane mode validation | Blocked | Real devices required |
| Permissions denied/revoked validation | Blocked | Real devices required |
| App restart validation | Blocked | Real devices required |
| Reconnect sync validation | Blocked | Real devices required |
| EAS build/upload | Blocked | Not started without explicit approval |

## Release Decision

Status: Not RC-1

Release score: 82/100

Local certification is green. Static native readiness is green. Release candidate status is blocked by missing physical-device validation, absent live OpenAI validation, no EAS login, no Android SDK/ADB, and no iOS credential/device validation in this environment.

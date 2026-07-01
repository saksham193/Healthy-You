# Phase 4A-2F Authenticated RC Runtime Validation Report

Date: 2026-07-01

## 1. Executive summary

Phase 4A-2F configured and started the existing Healthy You backend in staging mode, verified its `/health` and `/status` endpoints from the machine, rebuilt the Android RC APK with a non-placeholder staging API URL, and installed the APK on the API 36 emulator.

Authenticated Android RC runtime validation is still blocked. The emulator could not complete registration/login because the installed release APK could not reach the local HTTP staging backend. The backend itself was reachable from the host, and an ADB reverse tunnel was active, but the release APK still surfaced the sanitized network error before any auth request reached Express.

Beta readiness is not validated.

## 2. Backend URL tested

- Host/backend URL verified from machine: `http://127.0.0.1:4000`
- APK staging URL embedded for the local tunnel attempt: `http://127.0.0.1:4000`
- Emulator tunnel used: `adb reverse tcp:4000 tcp:4000`
- Previous LAN URL attempt, `http://192.168.31.67:4000`, was reachable from the host but not from the emulator.

## 3. Backend health/status result

Passed from the machine:

- `/health`: returned `status: ok`.
- `/status`: returned `service: healthy-you-backend`, `environment: staging`, `openAIConfigured: false`.

The backend was started with `HEALTHY_YOU_BACKEND_ENV=backend/.env.staging`.

## 4. APK artifact tested

- Artifact path: `android/app/build/outputs/apk/release/app-release.apk`
- Package: `com.healthyyou.app`
- Launch activity: `com.healthyyou.app/.MainActivity`
- Emulator: `Medium_Phone_API_36`
- Installed with `adb install -r`
- Launched directly via Android launcher/Monkey

The installed RC launched the real app activity. No Metro runtime or Expo Dev Launcher was observed.

## 5. Auth result

Not passed.

Validated:

- Login screen rendered.
- Register screen rendered.
- Registration form accepted input.
- Network failure remained sanitized in UI.

Blocked:

- Successful registration.
- Successful login.
- Logout.

Reason: the installed release APK did not reach the staging backend; no `/auth/register` request appeared in backend logs.

## 6. Session persistence result

Not validated. No authenticated session could be created.

## 7. Offline authenticated result

Not validated. No authenticated cached session could be created.

## 8. Cloud sync result

Not validated:

- Profile sync
- Memory sync
- Health summary sync
- Retry/reconnect sync
- Conflict/deduplication behavior

Reason: authentication remained blocked.

## 9. Health Connect result

Not validated in authenticated runtime.

Device package presence remained consistent with Phase 4A-2E:

- `com.google.android.healthconnect.controller` present

The app could not reach authenticated surfaces where Health Connect runtime flows are exercised.

## 10. AI runtime result

Not validated in authenticated runtime.

The staging backend reported `openAIConfigured: false`, so live Medibot/OpenAI runtime is also blocked until a real backend OpenAI secret is supplied. No mobile OpenAI secret was added.

## 11. Bugs found

- `RC-4A-2F-001`: Backend `/status` reported `environment: development` while running with staging config because it returned `NODE_ENV` instead of the app `ENVIRONMENT`.
- `RC-4A-2F-002`: Android release JS bundle can remain stale after `.env.staging` changes unless generated bundle artifacts are removed or the bundle task is forced.
- `RC-4A-2F-003`: Local HTTP staging backend is blocked from the release APK path. A cleartext-enabled RC build was not produced because that would weaken release network security without explicit approval.

## 12. Fixes implemented

- Replaced placeholder staging mobile API URL with `http://127.0.0.1:4000` for local ADB reverse validation.
- Updated EAS preview env to the same non-placeholder staging URL.
- Configured backend staging env with a non-placeholder local JWT secret and `OPENAI_API_KEY=` so `/status` honestly reports OpenAI as not configured.
- Fixed `/status` to report `env.ENVIRONMENT`, so staging reports as `staging`.

Validation after source changes:

- Mobile TypeScript: passed.
- Backend TypeScript: passed.
- Backend build/start: passed.
- Backend `/health` and `/status`: passed from machine.

## 13. Security/logging observations

- No OpenAI secret was added to mobile or backend config.
- `/status` correctly reports `openAIConfigured: false`.
- Sampled backend request logs included method/path/status/duration only, not auth bodies or tokens.
- Sampled Android logs did not show access tokens, refresh tokens, Bearer headers, or Authorization headers.
- Enabling cleartext traffic for a release APK is a security-sensitive change. The attempted hard-code was backed out and no cleartext-enabled APK was produced.

## 14. Remaining blockers

- A reachable HTTPS staging backend is still required for authenticated release APK validation.
- Alternatively, explicit approval is required to produce a staging-only cleartext release APK for local ADB reverse validation.
- Real OpenAI backend secret is required for live authenticated AI runtime validation.
- Session persistence, refresh, authenticated offline launch, cloud sync, Health Connect runtime, and Medibot runtime remain unvalidated.

## 15. Beta readiness assessment

Not beta-ready.

The app still lacks authenticated installed-RC validation against a reachable staging backend. Auth, session persistence, refresh behavior, authenticated offline mode, cloud sync, Health Connect authenticated runtime, and AI runtime with account context are not validated.

## 16. Recommended next step

Provision a real HTTPS staging backend URL with valid TLS, set `EXPO_PUBLIC_API_BASE_URL` to that URL, rebuild the RC APK, reinstall it, and rerun Phase 4A-2F from registration onward.

If HTTPS staging cannot be provisioned yet, explicitly approve a staging-only cleartext Android RC build for local ADB reverse testing and treat that artifact as non-production.

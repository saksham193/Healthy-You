# Phase 4A-2E Android RC Runtime Validation Report

Date: 2026-07-01

## 1. Executive summary

Phase 4A-2E was run against the real Android release-candidate APK:

`android/app/build/outputs/apk/release/app-release.apk`

The APK installs successfully on the API 36 emulator, launches directly into Healthy You, and does not show Expo Dev Launcher. The foreground activity is the real app activity:

`com.healthyyou.app/.MainActivity`

First-screen runtime stability passed. Offline unauthenticated launch and reconnect smoke testing passed. No fatal app crash or ANR was observed during the tested paths.

End-to-end beta readiness is not validated because the configured staging API host is unreachable:

`https://staging-api.healthy-you.example.com`

Runtime authentication, authenticated navigation, Health Connect permission flows, core AI runtime surfaces, and cloud sync could not be completed without a reachable staging backend and authenticated session.

Two genuine runtime bugs were found in the auth error path and fixed:

- Raw Android/network exception text was shown to users.
- Auth error state carried across auth screens.

## 2. Device/emulator tested

- Emulator: `Medium_Phone_API_36`
- Android target: API 36
- ABI tested: x86_64 release APK
- Physical Android device: not validated, no physical device was available in this run
- Health Connect modern package: installed
- Health Connect legacy package: not installed

## 3. APK artifact tested

- Artifact: `android/app/build/outputs/apk/release/app-release.apk`
- Package: `com.healthyyou.app`
- Launch activity: `com.healthyyou.app/.MainActivity`
- Metro required: no
- Expo Dev Launcher shown: no
- Debug APK used: no

## 4. Passed checks

- APK exists.
- APK installs with `adb install -r`.
- App launches directly with `adb shell monkey -p com.healthyyou.app -c android.intent.category.LAUNCHER 1`.
- Foreground activity is `com.healthyyou.app/.MainActivity`.
- Expo Dev Launcher is not shown.
- Metro is not required.
- First screen renders the Healthy You login screen.
- Force-stop/reopen returns to the Healthy You login screen.
- Offline unauthenticated launch does not crash.
- Reconnect after offline smoke test did not crash or leave a blank screen.
- Health Connect modern package detection was confirmed at device package level.
- App declares Health Connect read permissions.
- Narrow-screen auth smoke test showed no visible overlap in the reachable login form.
- `npx tsc --noEmit` passed after fixes.
- `node scripts/validate-auth-flow.js` passed after fixes.
- Rebuilt release APK installed and launched after fixes.
- Sensitive log scan found no `accessToken`, `refreshToken`, `Bearer`, or `Authorization` entries in the sampled app run.

## 5. Failed checks

- Successful login was not validated because the configured staging host did not resolve.
- Successful registration was not validated because the configured staging host did not resolve.
- Logout was not validated because login was blocked.
- Session persistence after authenticated restart was not validated because login was blocked.
- Refresh token behavior was not validated because login was blocked.
- Expired/failed refresh handling was not validated because login was blocked.
- Health Connect permission sheet was not reached because authenticated app surfaces were blocked.
- Full, partial, denied, and revoked Health Connect permission states were not validated.
- Manual sync, cached sync, no-data, and sync-error Health Connect runtime states were not validated.
- Medibot, daily briefing, trends, recommendations, and preventive wellness runtime screens were not validated in-app because authentication was blocked.
- Cloud profile sync, memory sync, health summary sync, deduplication, and conflict handling were not validated because staging was unreachable.

## 6. Bugs found

### RC-4A-2E-001: Raw network error exposed in login UI

Observed result:

`fetch failed: java.net.UnknownHostException: Unable to resolve host "staging-api.healthy-you.example.com": No address associated with hostname`

Impact: users saw raw platform exception details and internal host information.

Status: fixed.

### RC-4A-2E-002: Auth error persisted across auth screens

Observed result: after a failed login attempt, the same backend/network error appeared when navigating to the register screen.

Impact: confusing stale error state and poor auth screen isolation.

Status: fixed.

## 7. Fixes implemented

Files changed during Phase 4A-2E:

- `src/store/authStore.ts`
- `src/screens/Auth/LoginScreen.tsx`
- `src/screens/Auth/RegisterScreen.tsx`

Fix details:

- Added Android fetch/host-resolution failures to network error classification.
- Sanitized network/unreachable-backend auth errors to:

  `Unable to reach Healthy You services. Check your connection and try again.`

- Cleared auth error state when entering login/register screens.
- Cleared auth error state before switching between auth screens.

Validation after fixes:

- `npx tsc --noEmit` passed.
- `node scripts/validate-auth-flow.js` passed.
- `node scripts/build-android-rc.js` rebuilt the release APK successfully.
- Updated release APK installed successfully.
- Updated release APK launched to `com.healthyyou.app/.MainActivity`.
- Invalid login against unreachable staging now shows the sanitized user-facing error.

## 8. Health Connect runtime result

Partially validated.

Validated:

- Modern Health Connect package is present:

  `com.google.android.healthconnect.controller`

- Legacy package was not present:

  `com.google.android.apps.healthdata`

- The app declares Health Connect read permissions for activity, hydration, distance, exercise, sleep, steps, weight, and heart rate.

Not validated:

- Permission sheet opening
- Full permission grant
- Partial permission grant
- Permission denial
- Permission revocation
- Manual sync
- Cached sync
- Connected Live, Connected Cached, Connected No Data, Demo Data, and Sync Error UI states
- Device reconnect behavior for Health Connect sync
- Source labels

Reason: authenticated app runtime was blocked by unreachable staging API.

## 9. Auth runtime result

Partially validated, not passed end to end.

Validated:

- Login screen renders on first launch.
- Register screen is reachable.
- Invalid/unreachable backend login path remains stable.
- Network/backend failure message is sanitized after fix.
- Auth error no longer carries between login/register screens after fix.

Not validated:

- Successful registration
- Successful login
- Logout
- Session persistence after force close/reopen
- Refresh token behavior
- Expired/failed refresh handling
- Offline launch with cached authenticated session
- Reconnect after offline authenticated session

Reason: configured staging backend host is unreachable.

## 10. AI runtime result

Not validated in installed RC runtime.

Not validated:

- Medibot screen
- Direct metric answers
- Personalized coaching
- Daily briefing
- Trend explanations
- Goal/habit coaching
- Recommendation decision layer
- Preventive wellness
- AI memory restore
- Safety refusal for diagnosis
- Safety refusal for medication dosage
- Emergency escalation wording

Reason: authentication and authenticated app navigation were blocked by unreachable staging API. Live OpenAI behavior was not validated in this installed APK run.

## 11. Offline runtime result

Partially validated.

Validated:

- App launches offline while unauthenticated.
- App returns to the Healthy You login screen while offline.
- No crash or blank screen was observed during offline launch.
- Reconnect smoke test did not crash the foreground app.

Not validated:

- Cached profile load
- Cached health summaries
- Medibot offline response
- Daily briefing offline with cached context
- Recommendations offline
- Trends/preventive wellness offline
- Offline queue storing pending syncs
- Reconnect queue flushing

Reason: no authenticated cached session could be created because staging login/register was unavailable.

## 12. Cloud sync runtime result

Not validated.

Not validated:

- Profile sync
- Memory sync
- Health summary sync
- Offline queue
- Retry after reconnect
- Deduplication
- Conflict handling
- Background sync behavior

Reason: staging backend host is unreachable and no authenticated session could be established.

## 13. UI/navigation result

Partially validated.

Validated:

- First launch renders Healthy You auth UI.
- Login screen is stable.
- Register screen is reachable.
- Runtime stays on `MainActivity`.
- No Dev Launcher or Metro dependency appears.
- Narrow-screen login form smoke test showed no visible overlap in the reachable viewport.

Not validated:

- Home
- Dashboard cards
- Health sync card
- Medibot screen
- Trends
- Goals/habits
- Briefing
- Profile/settings
- Authenticated empty/error states

Reason: authentication was blocked by unreachable staging API.

## 14. Security/logging observations

- Sampled runtime logs did not contain `accessToken`, `refreshToken`, `Bearer`, or `Authorization`.
- Sampled runtime logs did not contain the dummy login password used during validation.
- Raw backend/network exception text was initially exposed in UI; this was fixed and retested in the installed RC APK.
- No raw Health Connect histories were observed in logs during this run, but Health Connect sync was not reached.
- Secure token storage behavior could not be fully validated because successful auth was blocked.

## 15. Remaining blockers

- `.env.staging` points to an unreachable placeholder-like staging URL:

  `https://staging-api.healthy-you.example.com`

- A reachable staging backend is required to validate auth, sessions, refresh tokens, Health Connect runtime flows, AI runtime surfaces, and cloud sync.
- Live OpenAI behavior requires a valid backend/OpenAI configuration.
- Physical Android validation remains outstanding.
- A physical-device ARM64 artifact remains recommended for device validation.

## 16. Beta readiness assessment

Not beta-ready.

The real RC APK artifact itself is valid for installed runtime testing: it installs, launches Healthy You directly, uses `MainActivity`, and does not require Metro. However, beta readiness cannot be claimed because authentication, Health Connect, offline authenticated behavior, AI runtime, and cloud sync were not validated end to end.

## 17. Recommended next step

Configure `.env.staging` with a real reachable staging backend URL, rebuild the release-candidate APK, reinstall it, and rerun Phase 4A-2E from authentication onward.

Recommended commands:

```powershell
npm run build:android:rc:local
adb install -r android/app/build/outputs/apk/release/app-release.apk
adb shell monkey -p com.healthyyou.app -c android.intent.category.LAUNCHER 1
```

For physical device validation, produce an ARM64 RC artifact:

```powershell
node scripts/build-android-rc.js --architectures=arm64-v8a
```

# Phase 4A-2C Android Runtime Validation Report

Date: 2026-07-01

## 1. Executive Summary

Phase 4A-2C is **not beta-ready**.

The APK exists and installs successfully on the Android API 36 emulator, but it does not launch into the Healthy You app runtime. It opens the Expo Development Build / Dev Launcher screen and requires a Metro server (`npx expo start`). This fails the release-candidate requirement for "No Metro/dev-client blocking issue" and prevents direct on-device validation of auth, Health Connect permission flows, offline mode, UI navigation, cloud sync, and live/core AI behavior inside the installed APK.

No application code fixes were implemented during this pass because the primary issue found is a build artifact/runtime packaging blocker, not an in-app runtime bug observed after the app loaded.

## 2. Device/Emulator Tested

- Emulator: `Medium_Phone_API_36`
- Model: `sdk_gphone64_x86_64`
- Android release: `16`
- Android SDK/API: `36`
- ABI: `x86_64`
- Physical Android device: **not validated**; no physical device was attached.

## 3. APK Install Result

- APK path: `android/app/build/outputs/apk/debug/app-debug.apk`
- APK exists: **pass**
- APK size observed: approximately 191 MB
- ADB install: **pass**
- Command result: `Performing Streamed Install` followed by `Success`
- Package: `com.healthyyou.app`
- Installed version: `versionName=1.0.0`, `versionCode=1`
- Package flags: `DEBUGGABLE`

## 4. Runtime Areas Tested

Fully or partially tested:

- APK existence
- ADB install
- Emulator launch attempt
- Force close/reopen attempt
- Health Connect package presence
- Android package permission declaration
- Logcat crash/error scan
- Static TypeScript checks
- Existing validation scripts for auth, device layer, offline intelligence, cloud/profile/memory/health sync, daily briefing, recommendation decision, preventive health, trend intelligence, predictive health, goal/habit coaching, AI quality, AI health routing, and AI regression

Not validated on-device because the APK is blocked by Expo Dev Launcher:

- Register/login/logout UI flows
- Session persistence in the installed app
- Health Connect permission sheet interaction
- Full/partial/denied/revoked Health Connect runtime grants
- Manual/cached/no-data/sync-error Health Connect UI states
- Offline launch and reconnect behavior in the installed app
- Medibot UI runtime
- Cloud sync behavior through the installed app UI
- Navigation and screen layout review beyond the Dev Launcher screen

## 5. Passed Checks

- `adb devices` eventually detected the emulator after resetting the ADB server.
- APK installed successfully.
- App process launched without an Android fatal crash.
- Force-close command succeeded.
- Reopen after force close succeeded at the Android activity level.
- Modern Health Connect package is installed: `com.google.android.healthconnect.controller`.
- App declares Health Connect read permissions for steps, distance, active calories, heart rate, sleep, weight, hydration, and exercise.
- `npx tsc --noEmit` passed.
- `npx tsc -p backend/tsconfig.json --noEmit` passed.
- `node scripts/validate-device-layer.js` passed.
- `node scripts/validate-auth-flow.js` passed.
- `node scripts/validate-offline-intelligence.js` passed.
- `node scripts/validate-health-summary-sync.js` passed.
- `node scripts/validate-cloud-profile-sync.js` passed.
- `node scripts/validate-memory-sync.js` passed.
- `node scripts/validate-daily-health-briefing.js` passed.
- `node scripts/validate-recommendation-decision.js` passed.
- `node scripts/validate-preventive-health.js` passed.
- `node scripts/validate-trend-intelligence.js` passed.
- `node scripts/validate-ai-regression-suite.js` passed: 78 scenarios.
- `node scripts/validate-goal-habit-coaching.js` passed.
- `node scripts/validate-predictive-health.js` passed.
- `node scripts/validate-ai-quality.js` passed.
- `node scripts/validate-ai-health-routing.js` passed.

## 6. Failed Checks

- **Failed:** Installed APK does not launch directly into the Healthy You app runtime.
- **Failed:** "No Metro/dev-client blocking issue."
- **Blocked:** On-device auth, Health Connect, offline, AI UI, cloud sync, and UI navigation validation.

## 7. Bugs Found

### RC-4A-2C-001: APK opens Expo Dev Launcher instead of Healthy You runtime

Evidence:

- Foreground activity after first launch:
  `com.healthyyou.app/expo.modules.devlauncher.launcher.DevLauncherActivity`
- Screenshot captured to:
  `healthy_you_launch.png`
- Visible screen text:
  `healthy-you Development Build`
  `Start a local development server with: npx expo start`

Impact:

- The APK is not independently runtime-valid as a release-candidate artifact.
- App flows cannot be validated without Metro.
- Beta readiness cannot be claimed.

### RC-4A-2C-002: Dev Launcher splash-screen error logged

Evidence:

- Logcat error:
  `DevLauncherController: Failed to hide splash screen`
- Root cause:
  `ClassNotFoundException: expo.modules.splashscreen.SplashScreenManager`

Impact:

- Observed in Dev Launcher path, not in the Healthy You app runtime.
- Should be rechecked after producing a non-dev-launcher RC build.

## 8. Fixes Implemented

None.

Reason: the installed artifact never entered the Healthy You app runtime. No genuine in-app runtime bug could be isolated safely from this APK. Changing architecture, AI behavior, or features was intentionally avoided.

## 9. Remaining Blockers

- Need an RC/installable Android artifact that launches the app without Metro or Expo Dev Launcher.
- Need physical Android device validation if required for release confidence.
- Need real Health Connect permission-flow validation with user grants/revocation.
- Need staging backend reachability validation through the installed app.
- Need live OpenAI runtime validation if `OPENAI_API_KEY` and backend proxy are available.

## 10. Health Connect Runtime Result

Status: **not validated on-device**

Validated:

- Modern package installed: `com.google.android.healthconnect.controller`
- Legacy package not observed: `com.google.android.apps.healthdata`
- Manifest/package declarations include requested Health Connect permissions.

Not validated:

- Availability detection from app UI/runtime
- Permission sheet opens
- Full grant
- Partial grant
- Denial
- Revocation
- Manual sync
- Cached sync
- No-data state
- Sync error state
- Device reconnect behavior
- Source labels
- UI states: `Connected - Live`, `Connected - Cached`, `Connected - No Data`, `Demo Data`, `Sync Error`

Reason: APK launches to Expo Dev Launcher, not Healthy You runtime.

## 11. Auth Runtime Result

Status: **scripted backend validation passed; installed-app runtime not validated**

Scripted validation passed:

- Register
- Duplicate register rejection
- Login
- Invalid login
- Protected route rejection
- Refresh token rotation
- Old refresh token invalidation
- Logout
- Refresh after logout rejection

Not validated in installed APK:

- Auth screen UI
- SecureStore behavior
- Session persistence after app restart
- Offline launch with cached session
- Reconnect after offline
- Navigation loops or blank-screen behavior

Reason: APK launches to Expo Dev Launcher.

## 12. AI Runtime Result

Status: **offline/mock/local scripted validation passed; live installed-app runtime not validated**

Scripted validation passed:

- Direct metric routing
- Offline Medibot-style responses
- Daily briefing
- Trend explanations
- Goal/habit coaching
- Recommendation decision layer
- Preventive wellness
- Predictive health
- Safety refusals for diagnosis and medication dosage
- Emergency escalation wording
- AI regression suite

Live OpenAI testing: **skipped**

Reason: validation scripts reported `OPENAI_API_KEY` absent.

Installed-app AI UI: **not validated**

Reason: APK launches to Expo Dev Launcher.

## 13. Cloud Sync Runtime Result

Status: **scripted validation passed; installed-app runtime not validated**

Scripted validation passed:

- Profile sync behavior
- Memory sync behavior
- Health summary sync behavior
- Offline queue behavior
- Deduplication
- Conflict/newer-write handling
- Queue avoids storing auth tokens

Not validated through installed app UI/runtime:

- Real staging backend reachability
- Background sync behavior
- Retry after device reconnect
- UI non-blocking behavior during background sync

Reason: APK launches to Expo Dev Launcher.

## 14. Offline Runtime Result

Status: **scripted offline intelligence validation passed; installed-app offline mode not validated**

Scripted validation passed:

- Explicit offline mode detection
- Offline health guidance
- Emergency safety language
- Cache lookup and TTL
- Memory queue dedupe
- Failed flush retention
- Reconnect recovery
- Corrupted queue recovery

Not validated in installed APK:

- Airplane-mode launch
- Cached profile and health summary rendering
- Offline Medibot UI
- Daily briefing UI with cached context
- Recommendations/trends/prevention UI offline
- Reconnect queue flush from app runtime

Reason: APK launches to Expo Dev Launcher.

## 15. UI/Runtime Stability Result

Status: **not validated for Healthy You UI**

Validated:

- Dev Launcher screen is visible after install.
- Force close/reopen returns to Dev Launcher.
- No Android fatal crash was observed during launch attempts.

Not validated:

- Home
- Auth screens
- Dashboard cards
- Health sync card
- Medibot screen
- Trends
- Goals/habits
- Briefing
- Profile/settings
- Error states
- Empty states
- Narrow-screen app layouts
- Text overflow/button crowding in app screens

Reason: APK launches to Expo Dev Launcher.

## 16. Security/Logging Observations

- Logcat did not show Healthy You access tokens or refresh tokens during this pass.
- The installed app runtime did not load, so this is only a limited observation.
- Backend/scripted validation output reported token presence checks but did not print token values.
- Android framework logs contained generic Android `token` strings unrelated to Healthy You auth tokens.
- SecureStore runtime behavior was not validated because the app runtime did not load.

## 17. Beta Readiness Assessment

**Not beta-ready.**

Required runtime areas were not actually validated in the installed APK:

- Install: passed
- Launch into app runtime: failed
- Auth runtime: not validated
- Health Connect runtime: not validated
- Offline runtime: not validated
- Core AI runtime: not validated in installed app
- Cloud sync runtime: not validated in installed app
- UI/runtime stability: not validated beyond Dev Launcher

## 18. Recommended Next Step

Produce a non-dev-launcher Android RC artifact that launches directly into Healthy You without Metro, then rerun Phase 4A-2C from installation onward on the API 36 emulator and any available physical Android device.

Suggested immediate validation target:

- Rebuild an installable RC APK/AAB variant without Expo Dev Launcher gating.
- Confirm launch foreground activity is not `expo.modules.devlauncher.launcher.DevLauncherActivity`.
- Repeat the full auth, Health Connect, offline, AI, cloud sync, UI, stability, and logging checklist against that artifact.

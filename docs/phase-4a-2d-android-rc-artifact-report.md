# Phase 4A-2D Android RC Artifact Report

Date: 2026-07-01

## 1. Executive Summary

Phase 4A-2D produced and validated a real Android RC APK for the API 36 emulator.

The new RC artifact installs successfully, launches directly into the Healthy You runtime, shows the login screen, does not open Expo Dev Launcher, and does not require Metro at app launch. The foreground activity is the real app activity:

`com.healthyyou.app/.MainActivity`

Artifact:

`android/app/build/outputs/apk/release/app-release.apk`

## 2. Root Cause

The Phase 4A-2C APK was built from the debug variant:

`android/app/build/outputs/apk/debug/app-debug.apk`

Because `expo-dev-client` is installed and the debug variant is debuggable, that artifact launched Expo Dev Launcher:

`expo.modules.devlauncher.launcher.DevLauncherActivity`

This was expected for the debug/dev-client workflow, but it was the wrong artifact for RC runtime validation.

## 3. Build Type Explanation

- Debug APK: development artifact; can launch Expo Dev Launcher and require Metro.
- EAS development profile: intentionally uses `"developmentClient": true`.
- EAS preview profile: internal APK profile without `"developmentClient": true`; suitable for staged RC distribution.
- Local RC APK: Gradle `assembleRelease`, with Expo's `export:embed` bundle task, suitable for emulator RC runtime validation.

`expo-dev-client` remains installed so development builds are preserved. The RC path uses the non-debuggable release build type instead of removing dev-client from the project.

## 4. Files Changed

- `package.json`
  - Added `build:android:rc:local`.
- `scripts/build-android-rc.js`
  - Added a local RC build helper.
  - Loads `.env.staging`.
  - Sets `NODE_ENV=production`.
  - Runs Gradle `assembleRelease`.
  - Defaults to `x86_64` for local API 36 emulator builds to avoid Windows path-length failure in the current long workspace path.
  - Supports `--all-architectures` for CI/short-path universal builds.

## 5. Build Command Used

Validation commands:

```text
npx tsc --noEmit
npx expo config
node scripts/build-android-rc.js
```

Package script now available:

```text
npm run build:android:rc:local
```

Optional variants:

```text
node scripts/build-android-rc.js --architectures=arm64-v8a
node scripts/build-android-rc.js --all-architectures
```

## 6. Artifact Path

APK:

`android/app/build/outputs/apk/release/app-release.apk`

Observed size:

`33,936,824 bytes`

Embedded JS bundle:

`android/app/build/generated/assets/react/release/index.android.bundle`

Observed bundle size:

`2,695,624 bytes`

Build log proof:

- `:app:createBundleReleaseJsAndAssets`
- `Android Bundled ... index.ts`
- `Writing bundle output to: android\app\build\generated\assets\react\release\index.android.bundle`
- `Copying 39 asset files`
- `:app:assembleRelease`
- `BUILD SUCCESSFUL`

## 7. Install Result

Target:

- Emulator: `Medium_Phone_API_36`
- Android API: `36`
- ABI: `x86_64`

Command:

```text
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

Result:

```text
Performing Streamed Install
Success
```

Installed package:

`com.healthyyou.app`

Package flags:

`HAS_CODE ALLOW_CLEAR_USER_DATA ALLOW_BACKUP`

Notably absent:

`DEBUGGABLE`

## 8. Launch Result

Command:

```text
adb shell monkey -p com.healthyyou.app -c android.intent.category.LAUNCHER 1
```

Result:

- Launch command succeeded.
- Healthy You runtime opened.
- First screen shown: `Welcome back` login screen.
- Screenshot evidence: `healthy_you_rc_launch.png`

## 9. Foreground Activity Result

Observed foreground activity:

```text
topResumedActivity=ActivityRecord{... com.healthyyou.app/.MainActivity ...}
ResumedActivity: ActivityRecord{... com.healthyyou.app/.MainActivity ...}
mFocusedApp=ActivityRecord{... com.healthyyou.app/.MainActivity ...}
```

Dev Launcher activity was not foreground:

`expo.modules.devlauncher.launcher.DevLauncherActivity`

## 10. Whether Metro Is Required

Metro is **not required at app launch** for the RC APK.

The release build uses Expo's embedded bundle flow during Gradle build time:

`bundleCommand = "export:embed"`

The app launched directly from the installed APK and displayed the Healthy You login screen without running `npx expo start`.

## 11. Environment/Staging URL Status

Local RC build environment source:

`.env.staging`

Embedded public environment values:

```text
EXPO_PUBLIC_ENVIRONMENT=staging
EXPO_PUBLIC_API_BASE_URL=https://staging-api.healthy-you.example.com
```

Status:

- Staging values are configured for the RC build helper.
- Staging backend reachability was not validated in Phase 4A-2D.
- The URL currently appears to be a placeholder/example staging URL and should be replaced with the real staging backend URL before full runtime validation if applicable.

## 12. Remaining Blockers

- Universal local multi-ABI release build hit a Windows path-length failure for `armeabi-v7a` CMake output in the current long workspace path.
- The produced RC APK is `x86_64`, suitable for the API 36 emulator tested here.
- Physical Android device validation needs an `arm64-v8a` RC build or a universal build from CI/shorter local path.
- Staging backend reachability still needs runtime validation.
- Health Connect permission and data flows still need runtime validation from this RC artifact.
- Live OpenAI behavior still depends on backend/key availability.

## 13. Exact Next Step for Phase 4A-2 Runtime Validation

Proceed with Phase 4A-2 runtime validation using:

`android/app/build/outputs/apk/release/app-release.apk`

Start from the Phase 4A-2C checklist again, but use the release RC artifact instead of:

`android/app/build/outputs/apk/debug/app-debug.apk`

Minimum first commands:

```text
adb install -r android/app/build/outputs/apk/release/app-release.apk
adb shell monkey -p com.healthyyou.app -c android.intent.category.LAUNCHER 1
adb shell dumpsys activity activities
```

Expected foreground activity:

`com.healthyyou.app/.MainActivity`

# Phase 4I Real-Device APK Compatibility Hotfix Report

Date: July 8, 2026

## Issue Summary

The closed beta release APK installed on an Android emulator but failed on two real Android phones with:

`App not installed as app isn't compatible with your phone.`

APK inspection confirmed that the distributed artifact contained only the `x86_64` native ABI, making it suitable for the emulator but incompatible with typical ARM-based Android phones.

## Root Cause

`android/gradle.properties` already configured all supported React Native architectures:

`armeabi-v7a,arm64-v8a,x86,x86_64`

However, `scripts/build-android-rc.js` passed a Gradle property that overrode that list. Its default value was `x86_64`, so a normal `build:android:rc:local` run produced an emulator-only APK.

## Old APK Compatibility Result

- Path: `android/app/build/outputs/apk/release/app-release.apk`
- SHA256: `37C22335DEBB025727B518D0617C2670D8ED9F70E2AFA3EBD3737066206F14C8`
- Size: 34,662,105 bytes
- Native code: `x86_64`
- `sdkVersion`: 26
- `targetSdkVersion`: 35
- Compatibility result: emulator-compatible, but not compatible with normal ARM Android phones

## Fix Made

Changed only the default architecture fallback in `scripts/build-android-rc.js`:

```text
x86_64
```

to:

```text
armeabi-v7a,arm64-v8a,x86,x86_64
```

The existing `--architectures=...`, `ANDROID_RC_ARCHITECTURES`, and `--all-architectures` override behavior remains unchanged.

## Rebuilt APK Compatibility Result

- Path: `android/app/build/outputs/apk/release/app-release.apk`
- SHA256: `D686292567B5FB2C3F1393A9308D9D050708740AC9346C7984AF26A907DACB14`
- Size: 81,622,589 bytes
- Native code: `arm64-v8a`, `armeabi-v7a`, `x86`, `x86_64`
- `sdkVersion`: 26
- `targetSdkVersion`: 35
- Build result: successful
- Compatibility result: the APK now contains both ARM phone ABIs and both emulator ABIs

The first all-ABI build attempt hit the Windows 260-character CMake/Ninja path limit while compiling `armeabi-v7a`. The successful build used a temporary `Y:` drive mapping to shorten the project path. This did not change the application source or artifact contents.

## Validation Commands

```powershell
git status
git log --oneline -10

$env:Path = 'C:\Users\SAKSHAM GUPTA\AppData\Local\Programs\cursor\resources\app\resources\helpers;' + $env:Path
subst Y: "C:\Users\SAKSHAM GUPTA\Desktop\healthy-you"
Set-Location Y:\healthy-you
npm.cmd run build:android:rc:local

& "$env:LOCALAPPDATA\Android\Sdk\build-tools\36.0.0\aapt.exe" dump badging android\app\build\outputs\apk\release\app-release.apk
Get-FileHash android\app\build\outputs\apk\release\app-release.apk -Algorithm SHA256
Get-Item android\app\build\outputs\apk\release\app-release.apk
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" devices -l
```

Observed rebuilt APK badging:

```text
sdkVersion:'26'
targetSdkVersion:'35'
native-code: 'arm64-v8a' 'armeabi-v7a' 'x86' 'x86_64'
```

## Install Validation

ADB started successfully, but `adb devices -l` reported no connected emulator or USB Android phone. No install attempt could be completed in this environment.

Real-phone installation must be manually verified by sending the corrected APK to the beta testers or connecting a phone and running:

```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" install -r android\app\build\outputs\apk\release\app-release.apk
```

## Distribution Decision

The old APK should be withdrawn because it is `x86_64`-only and is not suitable for the real-device beta.

The rebuilt APK is ready to send to real-device beta testers based on successful compilation and confirmed ARM ABI packaging. Final install and launch verification on at least one physical ARM Android phone remains required.

## Remaining Risks

- No physical-phone or emulator install was completed because no ADB device was connected.
- Runtime smoke testing was not repeated after packaging the universal APK.
- The universal four-ABI APK is larger than the previous x86_64-only artifact.
- Builds from the repository's long Windows path may hit the CMake/Ninja filename limit for `armeabi-v7a`; using a shorter checkout path or temporary drive mapping avoids that local build-environment issue.

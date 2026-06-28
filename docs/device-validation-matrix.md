# Sprint 18.5 Device Validation Matrix

Date: 2026-06-24
Scope: Manual physical-device certification plan.

## Certification Rule

Do not claim RC-1 until this matrix is executed on both:

- Android physical device
- iPhone physical device

Simulator, web, static config, and local export checks are useful readiness signals but do not satisfy physical-device validation.

## Manual Matrix

| Scenario | Android Physical Device | iPhone Physical Device | Expected Result |
| --- | --- | --- | --- |
| Fresh install | Blocked | Blocked | App launches without crash and shows current persisted/default health state |
| App restart | Blocked | Blocked | App restores store, cached device state, and Medibot context |
| Airplane mode | Blocked | Blocked | Offline UI remains usable; no network-only crash |
| Online AI | Blocked | Blocked | AI provider works when configured and online |
| Offline AI | Blocked | Blocked | Local/offline intelligence returns safe, deterministic guidance |
| Reconnect sync | Blocked | Blocked | Queued or stale data refreshes after network/device access returns |
| Permissions denied | Blocked | Blocked | App does not crash; unavailable permissions are reflected safely |
| Permissions revoked | Blocked | Blocked | Prior cache is preserved where available; live sync is not falsely reported |
| Health Connect sync | Blocked | N/A | Android reads Health Connect only after permission grant |
| Apple Health sync | N/A | Blocked | iOS reads Apple Health only after permission grant |
| Partial health permissions | Blocked | Blocked | Granted metrics sync; missing metrics remain unavailable or cached |
| No health data available | Blocked | Blocked | App falls back gracefully without claiming live health data |

## Android Physical Device Plan

1. Install a development or preview build on a real Android device.
2. Confirm Health Connect is installed or available through the platform.
3. Launch Healthy You and complete onboarding/profile state if required.
4. Grant all requested Health Connect permissions and run sync.
5. Confirm steps, hydration, sleep, calories, heart rate, or available metrics update with live/cached labels.
6. Deny all permissions and verify the app remains stable.
7. Revoke permissions from Android settings and relaunch.
8. Enable airplane mode, restart the app, and verify offline intelligence works.
9. Disable airplane mode and verify reconnect behavior and sync state.
10. Confirm Medibot context does not claim unavailable or revoked live data.

## iPhone Physical Device Plan

1. Install a development or preview build on a real iPhone.
2. Confirm Apple Health is available and has representative data.
3. Launch Healthy You and complete onboarding/profile state if required.
4. Grant all requested Apple Health permissions and run sync.
5. Confirm available health metrics update with live/cached labels.
6. Deny permissions and verify the app remains stable.
7. Revoke permissions from Apple Health settings and relaunch.
8. Enable airplane mode, restart the app, and verify offline intelligence works.
9. Disable airplane mode and verify reconnect behavior and sync state.
10. Confirm Medibot context does not claim unavailable or revoked live data.

## Execution Blockers

| Blocker | Impact |
| --- | --- |
| No Android physical device attached through ADB | Android install, Health Connect, permissions, airplane mode, restart, and reconnect checks cannot be executed |
| `adb` unavailable and Android SDK env vars unset | Local Android device install/log validation cannot be executed |
| No iPhone/Xcode environment available | Local iOS install, Apple Health, permissions, airplane mode, restart, and reconnect checks cannot be executed |
| EAS not logged in | Cloud/device build credential checks cannot be executed |
| No explicit approval for cloud builds/uploads | EAS build/upload intentionally not started |

## Current Result

Device readiness is blocked, not failed. Static config is ready for device validation, but physical-device execution has not occurred.

# Sprint 12.2 iOS HealthKit Architecture Audit

## Scope

Audited:

- `src/services/device/providers/DeviceProvider.ts`
- `src/services/devices/deviceService.ts`
- `src/services/device/HealthSyncManager.ts`
- `src/services/health/deviceHealthMapper.ts`
- `app.json`
- `eas.json`
- Android Health Connect plugin/config from Sprint 12.1

## Current Provider Selection

`DeviceService` currently creates:

- `HealthConnectProvider`
- `MockDeviceProvider`

Provider selection prefers Health Connect whenever its status is not `unavailable` or `error`; otherwise it falls back to mock health data.

Gap for Sprint 12.2:

- No platform-specific selection exists yet.
- iOS currently falls through to mock because Health Connect reports unavailable outside Android.
- Device copy assumes non-fallback provider means Android Health Connect.

## Metric Contract

The existing `DeviceHealthMetrics` contract already covers the iOS HealthKit metrics requested:

- `steps`
- `distanceMeters`
- `caloriesKcal`
- `heartRateBpm`
- `sleepMinutes`
- `weightKg`
- `hydrationMl`
- `exerciseMinutes`

No parallel metric shape is needed.

## Sync and Cache

`HealthSyncManager` is provider-agnostic. It accepts a sync operation, retries, queues failed syncs, stores cached metrics, and returns cached metrics when sync fails.

Apple Health should reuse this manager unchanged.

## Store and AI

`HealthStore` already calls `DeviceService.syncHealthData()`, then maps normalized metrics into:

- Fitness
- Nutrition
- Sleep
- Schedule
- Profile
- Vitals
- Health score

AI context, profile enrichment, prompts, insights, and UI already consume store-backed values. Apple Health must enter through `DeviceService`; screens must not call HealthKit directly.

## iOS Native Configuration Gap

`app.json` has an iOS bundle identifier, but lacks:

- HealthKit entitlement.
- `NSHealthShareUsageDescription`.
- Optional `NSHealthUpdateUsageDescription` for write access. Sprint 12.2 is read-only, so this is not required.

`eas.json` development profile targets the iOS simulator, but HealthKit validation needs a real iPhone. The report should call out that real HealthKit testing requires an iOS device/internal build profile, Apple Developer credentials, and Health data available on-device.

## Implementation Plan

1. Select one iOS HealthKit library.
2. Add iOS HealthKit config via a local Expo config plugin.
3. Add `AppleHealthPermissions`.
4. Add `AppleHealthProvider` implementing `DeviceProvider`.
5. Update `DeviceService` selection:
   - iOS -> Apple Health
   - Android -> Health Connect
   - Web/unsupported -> mock
6. Preserve the existing mapper, sync manager, store, AI, and UI paths.


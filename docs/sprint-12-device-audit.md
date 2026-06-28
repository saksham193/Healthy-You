# Sprint 12 Device Architecture Audit

## Scope

Audited the current device and health data path requested for Sprint 12:

- `src/services/devices/deviceService.ts`
- `src/hooks/useDevices.ts`
- `src/store/healthStore.ts`
- Profile connected devices UI
- Home and fitness watch sync UI
- Health service/store integration
- AI context, profile, trends, recommendations, and insights

The codebase currently uses `src/services/devices/` instead of `src/services/device/`.

## Current Data Flow

Mock constants -> health service -> health store -> screens/components -> AI context.

Device data currently follows a separate mock-only path:

`constants/mockData.connectedDevices` -> `deviceService` -> `healthStore.devices` -> `useDevices` -> Profile/Home cards.

One UI component bypasses the store:

`WatchSyncStatusCard` calls `getConnectedDevices()` directly.

## Mock Providers

`deviceService.ts` is the only provider-like implementation. It hardcodes:

- Apple Watch
- Google Fit
- Samsung Health
- Fitbit

The service marks Apple Watch and Google Fit as synced by default, but no provider actually connects, requests permissions, reads records, retries, persists sync state, or writes health observations into the store.

## Unused Or Missing Abstractions

Missing:

- Provider interface contract.
- Provider registry or selection.
- Health Connect provider.
- Permission manager.
- Sync manager.
- Offline cache.
- Retry and queue semantics.
- Timestamp tracking.
- Health metric normalization contract.
- Store action for syncing health data.

Existing but underused:

- `useDevices` already centralizes device reads through the store.
- `HealthStore` is the correct integration point for UI and AI.
- AI builders already read from `HealthStore`, so they can consume live data once the store is enriched.

## Health Store Findings

`healthStore.ts` loads all health sections and devices with `Promise.all`. Every health section is still backed by `constants/mockData`.

The store has no:

- `syncHealthData` action.
- Separate device loading/sync loading status.
- Last sync timestamp.
- Device sync error field.
- Health observation cache.
- Merge step that applies device records to fitness, nutrition, sleep, profile, and vitals.

## UI Findings

Profile and Home are mostly store-safe:

- `ProfileScreen` uses `useDevices`.
- `WatchSyncCard` uses `useDevices`.

Fitness has one direct provider/service dependency:

- `WatchSyncStatusCard` calls `getConnectedDevices()` directly and has a local mock fallback.

No UI redesign is needed. Existing props can be kept while sourcing device status from the store.

## AI Findings

AI is already aligned with the target architecture:

- `healthContextBuilder` reads store fitness, nutrition, sleep, schedule, profile, and vitals.
- `ProfileBuilder` reads store profile, fitness, sleep, and schedule.
- `HealthTrendEngine` reads store fitness, nutrition, sleep, profile, and schedule.
- Insights and recommendations consume the built AI context.

Required Sprint 12 change: live device observations must update store-backed health sections so Medibot observes steps, heart rate, sleep, weight, calories, hydration, and exercise without direct provider usage.

## Recommended Implementation Path

1. Add a `DeviceProvider` interface and shared health metric types.
2. Add `HealthConnectProvider` and `HealthConnectPermissions`.
3. Refactor mock behavior into a `MockDeviceProvider` that implements the same interface.
4. Upgrade `deviceService` into a provider selector and sync orchestrator.
5. Add `HealthSyncManager` for manual/periodic sync, queueing, retry, timestamp tracking, and offline fallback.
6. Add `syncHealthData` to `healthStore`.
7. Normalize synced observations into existing health data shapes.
8. Update `WatchSyncStatusCard` to use `useDevices`.
9. Extend profile/AI types with wearable, activity, rest, and recovery metadata.


# Sprint 12.3 Cross-Platform Device Validation Matrix

## Provider Isolation Report

Expected provider selection:

| Platform | Provider | Native module access | Fallback |
| --- | --- | --- | --- |
| Android | HealthConnectProvider | `react-native-health-connect` lazy import only inside Health Connect permissions helper | Mock only when Health Connect is unavailable |
| iOS | AppleHealthProvider | `react-native-health` lazy import only inside Apple Health permissions helper | Mock only when Apple Health is unavailable |
| Web | MockDeviceProvider | No HealthKit or Health Connect import | Always mock |
| Unsupported | MockDeviceProvider | No native health import | Always mock |

Pass criteria:

- Android never loads Apple Health native module.
- iOS never loads Health Connect native module.
- Web never loads either native health module.
- Screens/hooks do not import native health packages.

## Normalized Metric Contract

Every provider must return the same `DeviceHealthMetrics` shape:

| Field | Android | iOS | Web/mock |
| --- | --- | --- | --- |
| `providerId` | health-connect | apple-health | mock-health |
| `providerName` | Health Connect | Apple Health | Mock Health |
| `source` | live | live | fallback |
| `sourcePlatform` | android | ios | web/unsupported |
| `permissionStatus` | granted/partial/denied | granted/partial/denied/unknown derived from readable values | unavailable |
| `syncStatus` | synced/error | synced/error | synced/idle |
| `syncedAt` | ISO timestamp | ISO timestamp | ISO timestamp |
| `isStale` | cache only | cache only | cache only |
| `steps` | count | count | count |
| `distanceMeters` | meters | meters | meters |
| `caloriesKcal` | kilocalories | kilocalories | kilocalories |
| `heartRateBpm` | bpm | bpm | bpm |
| `sleepMinutes` | minutes | minutes | minutes |
| `weightKg` | kilograms | kilograms | kilograms |
| `hydrationMl` | milliliters | milliliters | milliliters |
| `exerciseMinutes` | minutes | minutes | minutes |

## Permission Matrix

### Android Health Connect

| Scenario | Expected result |
| --- | --- |
| Health Connect unavailable | No crash; mock fallback shown; native sync does not run |
| Health Connect available, no permissions yet | Permission request can run; no fake live sync before grant |
| All permissions granted | Live metrics sync; cache updated; store/AI/UI update |
| All permissions denied | No crash; no mock overwrite; cached metrics preserved; sync retry queued |
| Partial permissions granted | Granted metrics sync; missing metrics keep prior/store fallback values |

### iOS Apple Health

| Scenario | Expected result |
| --- | --- |
| Apple Health unavailable/simulator unsupported | No crash; mock fallback shown |
| Apple Health available, no permissions yet | Permission request can run; no fake live sync before grant |
| All readable permissions granted and data exists | Live metrics sync; cache updated; store/AI/UI update |
| All permissions denied | No crash; no mock overwrite; cached metrics preserved; sync retry queued |
| Partial permissions/data available | Readable metrics sync; missing metrics keep prior/store fallback values |

### Web / Unsupported

| Scenario | Expected result |
| --- | --- |
| Web export/runtime | Mock provider only; no native imports; UI remains stable |

## Cache and Offline Matrix

| Scenario | Expected result |
| --- | --- |
| First successful live sync | Metrics persisted in AsyncStorage cache |
| Native permission denied after prior sync | Cached metrics returned with `source: "cache"` and `isStale: true` |
| Native provider unavailable after prior sync | Cached metrics returned when native sync fails |
| Failed sync | Retry queued in `healthy-you.device.sync-queue` |
| Offline restart | Store can load cached metrics and AI context remains available |
| No prior cache and sync fails | Store falls back to baseline health service data; no crash |

## UI Data Source Checklist

Existing UI only:

- Watch Sync card reads `useDevices`.
- Fitness Watch Sync card reads `useDevices`.
- Fitness screen reads `useHealthData`.
- Nutrition screen reads `useHealthData`.
- Home/Dashboard reads `useHealthData` and `useDevices`.
- Profile devices reads `useDevices`.

Expected UI status:

- Live native data: `Live`.
- Cached native data: `Cached`.
- Mock fallback: `Demo`.
- No direct HealthKit or Health Connect calls in components/screens/hooks.

## AI Validation Scenarios

Synthetic cases can be tested by seeding store values or syncing device records:

| Scenario | Expected AI signal |
| --- | --- |
| Low sleep | `sleepScore`/`sleepMinutes` drop; Health Insight Engine flags sleep |
| Elevated heart rate | `heartRateBpm` rises; recovery insight appears |
| Low hydration | `hydrationGlasses` below goal; hydration insight/recommendation appears |
| Low activity | `steps`, `weeklyActivityMinutes`, and `fitnessScore` drop; fitness recommendations appear |
| High activity | Fitness status improves; recommendations shift toward maintenance/recovery |

AI path to verify:

- `healthContextBuilder`
- `ProfileBuilder`
- `ProfileScoring`
- `HealthInsightEngine`
- `RecommendationEngineV2`
- `promptBuilder`
- `MockAIProvider`
- `OpenAIProvider` request payload

## Platform Build Config Checklist

Android:

- Health Connect manifest permissions present.
- Health Connect rationale activity present.
- Android 14 permission usage alias present.
- Health Connect package query present.

iOS:

- HealthKit entitlement present.
- `NSHealthShareUsageDescription` present.
- iOS development profile targets physical device validation.

Web:

- `expo export --platform web` passes.
- Web uses mock fallback.

## Manual Test Runs

Android real device:

1. Install development APK.
2. Confirm Health Connect availability.
3. Grant all permissions and sync.
4. Deny all permissions and sync.
5. Grant partial permissions and sync.
6. Disconnect network and restart.
7. Confirm UI source labels and Medibot context.

iOS real device:

1. Install development build on iPhone.
2. Confirm Apple Health availability.
3. Grant all permissions and sync.
4. Deny permissions in Apple Health settings and sync.
5. Leave partial permissions/data available and sync.
6. Disconnect network and restart.
7. Confirm UI source labels and Medibot context.

Web:

1. Run web export.
2. Launch web build.
3. Confirm mock provider and no native crashes.


# Sprint 12.2 iOS HealthKit Readiness Report

## Architecture Report

Apple Health now plugs into the existing Sprint 12 architecture:

Apple Health / Apple Watch -> `AppleHealthProvider` -> `DeviceService` -> `HealthSyncManager` -> `HealthStore` -> AI Context -> Medibot / UI

No parallel store path was added. Screens do not call Apple Health directly.

## Package Selected

Selected package: `react-native-health@1.19.0`

Reason:

- iOS HealthKit focused.
- Supports custom dev clients and native iOS builds.
- Includes TypeScript definitions.
- Provides read APIs for steps, walking/running distance, active energy, heart rate, sleep, weight, water, and exercise time.
- Does not require adding a second native runtime such as Nitro modules.

Notes:

- The package install added transitive dependencies with npm audit/deprecation warnings. These do not block TypeScript or export validation, but should be reviewed before production release.

## Files Created

- `plugins/withAppleHealthKit.js`
- `src/services/device/providers/AppleHealthPermissions.ts`
- `src/services/device/providers/AppleHealthProvider.ts`
- `docs/sprint-12-2-ios-healthkit-audit.md`
- `docs/sprint-12-2-ios-healthkit-readiness-report.md`

## Files Modified

- `app.json`
- `eas.json`
- `package.json`
- `package-lock.json`
- `src/types/index.ts`
- `src/services/devices/deviceService.ts`
- `src/services/health/deviceHealthMapper.ts`
- `src/services/ai/healthContextBuilder.ts`

## iOS Permissions

Configured:

- `com.apple.developer.healthkit` entitlement.
- `NSHealthShareUsageDescription`.

Not configured:

- `NSHealthUpdateUsageDescription`, because Sprint 12.2 is read-only.
- `NSHealthClinicalHealthRecordsShareUsageDescription`, because clinical records are not requested.

Requested read permissions:

- Steps
- Walking/running distance
- Active energy burned
- Heart rate
- Sleep analysis
- Weight
- Water
- Apple exercise time

## Provider Selection Logic

`DeviceService` now selects:

- iOS -> `AppleHealthProvider`
- Android -> `HealthConnectProvider`
- Web/unsupported -> `MockDeviceProvider`

If Apple Health or Health Connect is unavailable, the service falls back safely to mock/cached behavior without touching the wrong native module.

## Metrics Supported

Normalized into `DeviceHealthMetrics`:

- `steps`
- `distanceMeters`
- `caloriesKcal`
- `heartRateBpm`
- `sleepMinutes`
- `weightKg`
- `hydrationMl`
- `exerciseMinutes`

Units are normalized to the same shape used by Android Health Connect.

## Validation Results

PASS:

- `npm install`
- `tsc --noEmit`
- `expo config --type introspect --json`
- `expo export --platform web`
- EAS CLI availability: `eas-cli/20.3.0`

Expo config introspection confirmed:

- HealthKit entitlement present.
- `NSHealthShareUsageDescription` present.
- Android Health Connect config remains present.
- Web export still succeeds.

BLOCKED:

- `eas build:inspect --platform ios --profile development --stage pre-build` requires Expo login in this environment.
- Cloud iOS build was not started because it uploads project code to Expo and requires explicit approval.
- Real Apple Health permission prompts and data reads require a physical iPhone.

## Manual Real iOS Test Plan

Required:

- Apple Developer Account with HealthKit capability available.
- Expo account login.
- EAS project linked.
- Physical iPhone, not simulator.
- Apple Health data available for activity, sleep, hydration, vitals, and weight where possible.
- Development build installed from EAS/internal distribution.

Commands:

```bash
npm install
npx tsc --noEmit
npx expo config --type introspect --json
eas build --platform ios --profile development
```

Device checks:

1. Install development build on iPhone.
2. Launch app.
3. Trigger device sync.
4. Confirm Apple Health permission prompt appears.
5. Grant all permissions and verify sync.
6. Repeat with denied permissions and verify no crash.
7. Repeat with partial permissions and verify partial metric sync.
8. Confirm Fitness, Nutrition, Profile, Dashboard, and Watch Sync show live values where available.
9. Ask Medibot about sleep, heart rate, hydration, and activity.
10. Sync once, disable network, restart app, and verify cached metrics/AI context remain stable.

## Blocked Items

- Real iOS dev build.
- Real iPhone install.
- HealthKit permission prompt observation.
- Real Apple Health data ingestion.
- Offline restart test on iPhone.
- Medibot live iOS response validation.

## Remaining Risks

- `react-native-health` has transitive dependency audit/deprecation warnings.
- Apple may require App Store Connect privacy/data declarations for HealthKit access.
- HealthKit permissions previously denied by the user may need to be re-enabled in the Apple Health app instead of prompting again.
- Hydration and weight depend on the user having those Apple Health samples available.
- Apple Watch-derived heart rate/sleep requires the user’s watch and Health app to be syncing correctly.

## Completion Percentage

Sprint 12.2 completion: 94%.

100% requires a successful iOS development build on a real iPhone, visible HealthKit prompts, live Apple Health data ingestion, store updates, Medibot context validation, and offline cache validation.


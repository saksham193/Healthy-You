# Healthy You Architecture Report

## 1. Current Project Structure

```text
App.tsx
src/
  components/
    chat/
    common/
    fitness/
    home/
    layout/
    nutrition/
    profile/
    schedule/
  constants/
    mockData.ts
  hooks/
    useAssistantData.ts
    useDevices.ts
    useHealthData.ts
  navigation/
    BottomTabs.tsx
  screens/
    Assistant/
    Diet/
    Fitness/
    Home/
    Nutrition/
    Profile/
    Schedule/
    Sleep/
    Workout/
  services/
    assistant/
    devices/
    health/
  store/
    healthStore.ts
  theme/
    colors.ts
    shadows.ts
    spacing.ts
    typography.ts
  types/
    index.ts
  utils/
    tone.ts
```

## 2. Screen Architecture

Primary tab screens are registered through `BottomTabs.tsx`:

- `Chat` -> `AssistantScreen`
- `Nutrition` -> `NutritionScreen`
- `Fitness` -> `FitnessScreen`
- `Data` -> `HomeScreen`
- `Schedule` -> `ScheduleScreen`
- `Profile` -> `ProfileScreen`

Dashboard screens consume data through hooks instead of importing mock data directly. `SleepScreen` is also service-backed, but it is not currently registered as a route.

## 3. Shared Component Architecture

The app uses shared layout and display primitives consistently:

- `ScreenContainer`
- `AppHeader`
- `ScreenSheet`
- `DashboardSection`
- `CustomCard`
- `StatsCard`
- `ProgressRing`
- `ActivityChart`
- `ReminderCard`
- `EmptyState`

Domain-specific cards live under their related component folders and compose the shared primitives.

## 4. Store Architecture

`src/store/healthStore.ts` is the central Zustand store for health dashboards.

State includes:

- `healthScore`
- `nutrition`
- `fitness`
- `sleep`
- `schedule`
- `profile`
- `vitals`
- `devices`
- `loading`
- `error`

Actions include:

- `loadHealthData()`
- `refreshHealthData()`
- `loadDevices()`

The store loads typed service responses and exposes a single source of truth for Home, Nutrition, Fitness, Schedule, Profile, Sleep, and device cards.

## 5. Service Architecture

Services are the only mock data boundary:

- `services/health/healthService.ts`
- `services/health/healthAggregator.ts`
- `services/devices/deviceService.ts`
- `services/assistant/assistantService.ts`

Mock data remains in `constants/mockData.ts`, but screens no longer import it directly.

## 6. Hook Architecture

Hooks isolate UI from service/store details:

- `useHealthData()` reads health dashboard state from Zustand.
- `useDevices()` reads connected health devices from Zustand.
- `useAssistantData()` reads Medibot mock data through the assistant service.

The hook layer is ready for future API-backed services because screens already depend on hook contracts instead of mock constants.

## 7. Data Flow Diagram

```text
UI Screens / Cards
  |
  v
Hooks
  |
  v
Zustand Store
  |
  v
Services
  |
  v
Mock Data
```

Assistant currently follows:

```text
AssistantScreen
  |
  v
useAssistantData
  |
  v
assistantService
  |
  v
Mock Data
```

## 8. Navigation Diagram

```text
NavigationContainer
  |
  v
BottomTabNavigator
  |-- Chat
  |-- Nutrition
  |-- Fitness
  |-- Data
  |-- Schedule
  |-- Profile
```

`FloatingMedibotButton` uses the navigation ref to route to `Chat`.

Home feature card route checks:

- Nutrition feature -> `Nutrition`
- Fitness feature -> `Fitness`
- Schedule feature -> `Schedule`

## 9. Health Score Flow

```text
HomeScreen / ProfileScreen
  |
  v
useHealthData()
  |
  v
healthStore.healthScore
  |
  v
fetchHealthScore()
  |
  v
calculateHealthScore()
```

Health score weighting:

- Fitness: 40%
- Nutrition: 25%
- Sleep: 20%
- Medication adherence: 10%
- Profile completion: 5%

Status thresholds:

- 85+ Excellent
- 70-84 Good
- 55-69 Fair
- Below 55 Needs Improvement

## 10. Device Integration Flow

```text
WatchSyncCard / Profile connected devices
  |
  v
useDevices()
  |
  v
healthStore.devices
  |
  v
deviceService
```

Current mock providers:

- Apple Watch
- Google Fit
- Samsung Health
- Fitbit

The provider mapping is isolated to `deviceService`, so future Apple Health, Google Fit, or Samsung Health integrations can replace the service without screen rewrites.

## 11. Technical Debt Remaining

- Node is not available on PATH, so `npm install`, TypeScript, and ESLint validation cannot execute in this environment.
- `package.json` does not currently define a `lint` script.
- ESLint is not listed in project dependencies.
- `src/screens/Diet/DietScreen.tsx` is an unused alias to Nutrition.
- `src/screens/Workout/` is an empty obsolete folder.
- `SleepScreen` is service-backed but not registered in navigation.
- Store loading state is shared across all data domains; future API work may benefit from domain-specific loading states.

## 12. Sprint 10 Readiness Assessment

The architecture is largely ready for Sprint 10 AI integration:

- Dashboard screens are decoupled from mock data.
- Health and device service boundaries are clear.
- Aggregated health score is centralized.
- Assistant mock data is now behind a service and hook.
- Navigation routes are aligned with the active tab schema.

Sprint 10 should wait until local Node, TypeScript, and lint validation are restored and passing.

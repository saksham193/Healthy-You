# Phase 4C-1 Screen Functionality Audit Report

## 1. Executive summary

Healthy You is not ready for beta from a full functionality standpoint.

The app has a solid runtime foundation: authentication, secure token persistence, backend auth/profile/memory/health-summary APIs, Health Connect read plumbing, device sync caching/queueing, Medibot chat, offline AI fallback, safety guards, conversation/session persistence, and several AI intelligence engines are implemented.

The main beta gap is that many visible screens still present polished cards backed by `src/constants/mockData.ts`, with user actions that show placeholder alerts instead of creating, editing, completing, deleting, scheduling, exporting, or syncing real user-entered records. Phase 4C should therefore focus on turning the existing screen surfaces into real workflows rather than adding new visual polish.

Highest-risk P0 blockers:

- Nutrition meal/hydration logging is not functional.
- Schedule habits, medication reminders, appointments, and quick actions are not CRUD-backed.
- Fitness workout completion/start/logging is not functional.
- Profile/account settings, privacy controls, data export/delete, and profile editing are mostly placeholders.
- Notifications/reminders and calendar integration are missing.
- Reports/export/share screens are missing.
- Most health dashboard data still originates from mock data, with Health Connect overlay only for supported synced metrics.

## 2. Current roadmap position

- Completed checkpoint context: Phase 3 AI Intelligence Platform, Phase 4A Android RC Runtime Validation, Phase 4B UI polish and Ayurveda card work.
- Current phase: Phase 4C - Screen Functionality Completion.
- This report starts Phase 4C-1 - Screen Functionality Audit.
- Audit stance: no implementation changes, no UI redesign, no architecture changes, no commits.

## 3. Audit scope

Inspected:

- `src/screens`
- `src/components`
- `src/store`
- `src/services`
- `src/navigation`
- `src/hooks`
- `src/constants/mockData.ts`
- `backend/src`
- `package.json`
- `app.json`

Validation:

- TypeScript/build not run because this was documentation-only.
- Required repository checks were run at the end: `git status --short` and `git diff --stat`.

## 4. Functionality status table

| Feature / screen | Current status | Evidence/files inspected | Real functionality present | Missing functionality | Data source | Persistence | Backend/cloud dependency | Beta priority | Recommended next action |
|---|---|---|---|---|---|---|---|---|---|
| Login/Register | MOSTLY FUNCTIONAL | `LoginScreen.tsx`, `RegisterScreen.tsx`, `authStore.ts`, `AuthApi.ts`, `TokenStorage.ts`, backend auth routes/controllers | Register, login, logout, refresh, secure token save/clear, sanitized network auth errors | Forgot password is placeholder; needs device QA against staging/prod | Backend auth API | SecureStore tokens; backend DB tokens/users | Required | P0 | Verify end-to-end on device and add forgot-password decision |
| Auth hydration/session restore | MOSTLY FUNCTIONAL | `RootNavigator.tsx`, `authStore.ts`, `ApiClient.ts` | Hydrates tokens, restores user, handles backend unavailable state, auth failure handler | Needs real reconnect QA and expired token UX verification | SecureStore plus `/users/me` | SecureStore | Required | P0 | Device test login, app restart, offline resume, expired session |
| Profile/logout | PARTIALLY FUNCTIONAL | `ProfileScreen.tsx`, profile components, `ProfileCloudSync.ts`, `ProfileApi.ts`, `UserApi.ts` | Profile display, logout, cloud profile sync status, health backup status, connected-device action | Edit profile is placeholder; account/privacy/settings/export/share/delete are placeholder/missing | Mostly mock profile plus built personal profile/cloud sync | AsyncStorage profile cache/queue; backend profile | Partial | P0 | Implement account/profile settings workflows |
| Health Connect / device sync | MOSTLY FUNCTIONAL | `useDevices.ts`, `deviceService.ts`, `HealthConnectProvider.ts`, `HealthSyncManager.ts`, `app.json` | Health Connect permission request/read path, status labels, retry alerts, cache, sync queue, periodic sync | Needs device QA, permission education screens, no-data state hardening, explicit reconnect UX | Health Connect when available; mock fallback; cache | AsyncStorage cache/queue | No backend for raw device records; summary backup exists | P0 | Verify on Android device/emulator with Health Connect |
| Medibot / Chat | MOSTLY FUNCTIONAL | `AssistantScreen.tsx`, `useMedibot.ts`, `aiService.ts`, AI providers, backend AI route/proxy | Real message send, local/offline fallback, OpenAI provider path, safety guard, conversation memory, session save, suggestions | History/prompts are mock; voice and attachment are placeholders; cloud provider depends on env/backend | Mixed: mock starter data plus live/local AI | AsyncStorage session/memory/cache; backend memories | Optional for offline, required for OpenAI | P1 | Verify cloud OpenAI and replace mock history with real history |
| Dashboard metrics | PARTIALLY FUNCTIONAL | `HomeScreen.tsx`, `healthStore.ts`, `healthService.ts`, `deviceHealthMapper.ts` | Dashboard renders loaded store data; Health Connect overlay can update supported metrics | Base vitals/charts/features are static; Sleep card is hardcoded; no drill-down | Mock data plus device overlay | Health summary backup only | Partial | P1 | Replace static dashboard metrics with persisted/device-derived summaries |
| AI insights / recommendations | PARTIALLY FUNCTIONAL | `AIInsightEngine.ts`, recommendation engines, `aiService.ts`, `healthContextBuilder.ts`, screen cards | Engines generate dynamic context for Medibot responses | Dedicated screen rendering path is limited; visible Nutrition/Fitness insight cards are mock | Dynamic in AI context; mock in screens | AI memory/cache only | Optional/AI backend | P1 | Surface dynamic insights on dashboard/Nutrition/Fitness |
| Daily briefing | PARTIALLY FUNCTIONAL | `DailyHealthBriefingEngine.ts`, `healthContextBuilder.ts`, `aiService.ts` | Engine generates briefing inside AI context | No clear first-class screen/card trigger or persistence UX | Dynamic context | Not first-class persisted except response metadata/context | No direct backend route | P1 | Add dashboard briefing card fed by engine |
| Goals / habits | PARTIALLY FUNCTIONAL | `GoalHabitCoachingEngine.ts`, `ScheduleScreen.tsx`, `HabitTrackerCard.tsx`, `mockData.ts` | Coaching engine exists; schedule displays habit cards | Mark complete/add/edit/delete are not real; no user habit persistence | Mock schedule habits plus dynamic AI context | None for user habit records | None | P0 | Implement habit store and schedule interactions |
| Nutrition | PARTIALLY FUNCTIONAL | `NutritionScreen.tsx`, nutrition components, `AyurvedaSection.tsx`, `FoodEducationSection.tsx`, `healthService.ts` | Displays calories/macros/meals/hydration; Ayurveda selector works locally; food modal works | Log meal/scan/AI meal plan are placeholders; no meal CRUD; no hydration write; no persistence/backend | Mock nutrition data | None | None for nutrition records | P0 | Implement nutrition logging and hydration persistence |
| Fitness planner | PARTIALLY FUNCTIONAL | `FitnessScreen.tsx`, workout/fitness components, `ExerciseRecommendationSection.tsx`, `healthService.ts` | Displays workouts, step data, Health Connect sync status, exercise recommendation modal | Start workout, timer, log exercise, mark complete are placeholders/no state updates | Mock fitness plus Health Connect overlay | None for workout records | None for workouts | P0 | Implement workout completion/start/log workflows |
| Sleep module | PARTIALLY FUNCTIONAL | `SleepScreen.tsx`, `ScheduleScreen.tsx`, `SleepScheduleCard.tsx`, `healthService.ts` | Sleep data type, mock sleep insight display, sleep schedule display; Health Connect sleep read exists | Sleep screen is not in bottom tabs; no sleep routine edit; no sleep logging; dashboard sleep values partly hardcoded | Mock plus Health Connect read capability | None for sleep routines | No dedicated backend | P1 | Decide navigation and connect sleep to device summaries |
| Medication | STATIC/MOCK ONLY | `ScheduleScreen.tsx`, `MedicationReminderCard.tsx`, `mockData.ts`, medication predictor/agent | Medication reminder cards display; AI agent/predictor exists | Add/edit/delete medication, mark taken/skipped, dosage/time persistence, reminders missing | Mock medication reminders | None | None | P0 | Build medication tracker/reminder data model |
| Reports / analytics | PARTIALLY FUNCTIONAL | trend/analytics services, `ActivityChart`, Profile actions | Charts and trend engines exist; profile has export/share action labels | No report screen, export/share support, weekly/monthly report UX, AI report summary surface | Mock charts plus dynamic services | Health summaries backend available | Partial | P1 | Add health report generation/export flow |
| Notifications/reminders | MISSING | `package.json`, `app.json`, `ScheduleScreen.tsx`, search results | Visual reminder cards only | No notification package/config, permission flow, local scheduling, reminder model integration | None | None | None | P0 | Add notification/reminder foundation before beta |
| Calendar integration | MISSING | `package.json`, `app.json`, `ScheduleScreen.tsx`, search results | Appointment cards display | No calendar package/config, permission flow, add/sync appointments | Mock appointments | None | None | P2 | Defer if not core beta promise, or implement basic appointment CRUD |
| Settings/privacy/account deletion | MISSING / PARTIAL | `ProfileScreen.tsx`, backend user routes, `UserApi.ts`, search results | Logout and user name update API exist | Settings screen missing; privacy/consent/data export/delete/account deletion/legal placeholders missing | N/A | N/A | Backend lacks delete/export routes | P0 | Add settings/privacy/account deletion scope |

## 5. Screen-by-screen findings

### Auth screens

Files:

- `src/screens/Auth/LoginScreen.tsx`
- `src/screens/Auth/RegisterScreen.tsx`
- `src/screens/Auth/ForgotPasswordScreen.tsx`
- `src/screens/Auth/AuthLoadingScreen.tsx`
- `src/navigation/RootNavigator.tsx`
- `src/store/authStore.ts`

Findings:

- Login and register call real store methods.
- Store methods call backend APIs through `AuthApi.ts`.
- Tokens persist via `expo-secure-store`.
- Auth hydration gates the app and restores existing sessions.
- Network-unavailable errors are sanitized to user-safe copy.
- Logout clears tokens even if backend logout fails.
- Forgot password only returns to login; it does not request a password reset.

Status: MOSTLY FUNCTIONAL.

Beta priority: P0 for device/backend verification; forgot password can be P2 if not promised for beta.

### Data / Home dashboard

Files:

- `src/screens/Home/HomeScreen.tsx`
- `src/hooks/useHealthData.ts`
- `src/store/healthStore.ts`
- `src/services/health/healthService.ts`
- `src/services/health/deviceHealthMapper.ts`
- `src/components/home/WatchSyncCard.tsx`

Findings:

- The screen consumes `useHealthData`, not local component-only constants.
- `healthStore.loadHealthData()` loads mock health domain data, syncs device metrics, applies a device overlay, loads devices, starts periodic sync, and backs up a health summary.
- Feature cards navigate to Nutrition/Fitness/Schedule, but Sleep only shows an alert saying sleep is summarized on dashboard.
- Blood pressure/glucose charts and several dashboard values are static from mock data.
- Sleep record/quality cards are hardcoded in the screen.

Status: PARTIALLY FUNCTIONAL.

Beta priority: P1.

### Nutrition

Files:

- `src/screens/Nutrition/NutritionScreen.tsx`
- `src/components/nutrition/*`
- `src/services/health/healthService.ts`
- `src/constants/mockData.ts`

Findings:

- Personalized Plan, Ayurveda, and Recipes tabs work locally.
- Ayurveda card selection updates local UI and the dosha description.
- Recipe/food education cards open a modal.
- Meal cards, calorie/macros, hydration, insights, and actions are rendered from mock data.
- Quick actions show placeholder alerts: "ready for the next connected workflow."
- No meal add/edit/delete, calorie recalculation, macro recalculation, hydration increment, store persistence, or backend nutrition model exists.

Status: PARTIALLY FUNCTIONAL.

Beta priority: P0.

### Fitness

Files:

- `src/screens/Fitness/FitnessScreen.tsx`
- `src/components/fitness/*`
- `src/services/devices/deviceService.ts`
- `src/services/health/deviceHealthMapper.ts`
- `src/constants/mockData.ts`

Findings:

- The screen displays fitness summary, weekly activity, workout plans, BMI, steps, recovery insights, device sync status, and exercise recommendation modals.
- Health Connect/device overlay can update steps, calories, heart rate, sleep-derived values, and related health data.
- Workout plans and actions remain mock/static.
- Start workout, log exercise, AI coach, timer, and workout completion do not persist or update state.

Status: PARTIALLY FUNCTIONAL.

Beta priority: P0.

### Schedule

Files:

- `src/screens/Schedule/ScheduleScreen.tsx`
- `src/components/schedule/*`
- `src/constants/mockData.ts`

Findings:

- Schedule displays timeline events, medications, water tracking, sleep schedule, appointments, habits, adherence chart, and quick actions.
- Quick Add Water and all schedule quick actions are placeholder alerts.
- Habit cards display completion state but cannot toggle or persist completion.
- Medication cards display status but cannot mark taken/skipped.
- Appointment cards are static and have no add/edit/sync flow.

Status: STATIC/MOCK ONLY for most user workflows; PARTIALLY FUNCTIONAL as a display screen.

Beta priority: P0 for medication/habit/reminder functionality.

### Medibot / Chat

Files:

- `src/screens/Assistant/AssistantScreen.tsx`
- `src/hooks/useAssistantData.ts`
- `src/hooks/useMedibot.ts`
- `src/services/assistant/assistantService.ts`
- `src/services/ai/aiService.ts`
- `src/services/ai/providers/*`
- `backend/src/routes/aiRoutes.ts`
- `backend/src/services/OpenAIProxyService.ts`

Findings:

- Chat input sends through `useMedibot` to `aiService.sendMessage`.
- AI pipeline includes intent classification, direct metric answers, safety guard, offline provider, OpenAI provider route, orchestrator composition, memory save, personalization learning, and cached responses.
- Conversation state is saved locally through `MedibotSessionStore`.
- Starter assistant data (prompts, quick actions, history, initial conversation) comes from `mockData.ts`.
- Voice input and attachments are explicit placeholders.
- OpenAI path requires `EXPO_PUBLIC_AI_PROVIDER=openai`, backend availability, auth token, and configured backend OpenAI key.

Status: MOSTLY FUNCTIONAL.

Beta priority: P1.

### Profile

Files:

- `src/screens/Profile/ProfileScreen.tsx`
- `src/components/profile/*`
- `src/store/authStore.ts`
- `src/store/healthStore.ts`
- `src/services/profile/ProfileCloudSync.ts`
- `src/services/api/UserApi.ts`
- `src/services/api/ProfileApi.ts`

Findings:

- Displays profile, health goals, medical info, connected devices, emergency contacts, achievements, account identity, profile sync status, health summary backup status.
- Logout is real and includes confirmation.
- Device card press triggers real device sync handling.
- Edit profile and profile quick actions are placeholders.
- Backend supports user name update and health profile sync, but UI does not expose editing.
- No settings/privacy/account deletion/data export UX.

Status: PARTIALLY FUNCTIONAL.

Beta priority: P0 for account/privacy/profile editing minimum set.

### Sleep

Files:

- `src/screens/Sleep/SleepScreen.tsx`
- `src/components/schedule/SleepScheduleCard.tsx`
- `src/services/health/healthService.ts`
- `src/services/device/providers/HealthConnectProvider.ts`

Findings:

- `SleepScreen` exists but is not part of `BottomTabs`.
- Schedule screen shows sleep schedule.
- Health Connect provider can read sleep session duration.
- Sleep screen data is mock-derived and no sleep workflows exist.

Status: PARTIALLY FUNCTIONAL but not first-class navigable.

Beta priority: P1.

### Diet

Files:

- `src/screens/Diet/DietScreen.tsx`

Findings:

- `DietScreen` re-exports `NutritionScreen`.
- No separate Diet route exists in bottom tabs.

Status: DUPLICATE/ALIAS.

Beta priority: P3.

## 6. Store/service/backend linkage findings

### Real linkage

- Auth:
  - Frontend: `AuthApi.ts`, `authStore.ts`, `TokenStorage.ts`
  - Backend: `/auth/register`, `/auth/login`, `/auth/refresh-token`, `/auth/logout`
  - Persistence: SecureStore and backend SQLite repositories.

- User/profile:
  - Frontend: `UserApi.ts`, `ProfileApi.ts`, `ProfileCloudSync.ts`, `healthStore.ts`
  - Backend: `/users/me`, `/profile`
  - Persistence: AsyncStorage cache/queue and backend profile repository.

- Health summary sync:
  - Frontend: `HealthSummaryCloudSync.ts`, `HealthSummaryApi.ts`, `healthStore.ts`
  - Backend: `/sync/health-summary`
  - Persistence: AsyncStorage local summaries/queue and backend health summary repository.

- Memory sync:
  - Frontend: `LongTermMemory.ts`, `MemoryApi.ts`, `OfflineMemoryQueue.ts`
  - Backend: `/memories`
  - Persistence: AsyncStorage memory store/queue and backend memory repository.

- AI provider:
  - Frontend: `aiService.ts`, provider factory, OpenAI/offline/mock providers
  - Backend: `/ai/message`, `OpenAIProxyService.ts`
  - Persistence: local memory/session/cache, backend memories, backend observability/evaluation stores.

- Device sync:
  - Frontend only for raw device reads: `HealthConnectProvider.ts`, `HealthSyncManager.ts`
  - Persistence: AsyncStorage raw metric cache/queue.
  - Backend receives derived health-summary backups, not raw records.

### Weak or missing linkage

- Nutrition records: no store, no backend routes, no persistence.
- Workout records: no store, no backend routes, no persistence.
- Medication records: no store, no backend routes, no persistence.
- Habit records: no store, no backend routes, no persistence.
- Appointment/calendar records: no store, no backend routes, no persistence.
- Notification schedules: no package/config/model.
- Reports/export/share: no report generation/export/share screen.
- Settings/privacy/account deletion: no dedicated screen or backend delete/export routes.

## 7. Mock/static data inventory

Primary mock source:

- `src/constants/mockData.ts`

Mock/static areas:

- Home health summaries and feature cards.
- Nutrition summary, macros, meals, insights, actions.
- Fitness summary, weekly activity, workout plans, exercise categories, recovery insights, actions.
- Sleep insights and schedule.
- Medibot prompts, quick actions, history, and initial conversation.
- Schedule summary, timeline events, medications, appointments, habits, adherence chart, actions.
- Profile summary, body metrics, vital metrics, health goals, medical info, emergency contacts, achievements, profile actions.

Additional static/hardcoded data:

- `HomeScreen.tsx` sleep record and sleep quality cards.
- `FoodEducationSection.tsx` food education data.
- `ExerciseRecommendationSection.tsx` recommendation data/modal content.
- Ayurveda dosha summaries in `AyurvedaSection.tsx`.
- Placeholder alert text across Nutrition, Fitness, Schedule, Profile, Assistant voice/attachment.

Mixed real/static areas:

- Dashboard/Fitness/Profile device sync can show real Health Connect status/data when available, but most surrounding domain data still starts from mock constants.
- Medibot uses a real AI pipeline after send, but starter workspace content is mock.

## 8. Missing user workflows

- Forgot password/reset.
- Profile edit form and save path.
- Privacy/settings screen.
- Account deletion.
- Data export/delete requests.
- Consent and permission management beyond Health Connect prompts.
- Nutrition meal add/edit/delete.
- Nutrition hydration increment/decrement.
- Food scan.
- AI meal plan generation surfaced into nutrition UI.
- Fitness start workout.
- Fitness workout timer/session tracking.
- Workout mark complete.
- Exercise logging.
- Habit add/edit/delete/toggle completion.
- Medication add/edit/delete.
- Medication mark taken/skipped.
- Medication reminder scheduling.
- Appointment add/edit/delete.
- Calendar permission/sync.
- Local notification permission/scheduling.
- Report generation/export/share.
- Weekly/monthly summary screens.
- First-class dynamic AI insight/daily briefing display.
- Sleep routine edit and detailed sleep screen navigation.

## 9. Beta-blocking gaps

P0 blockers for a credible beta:

- Nutrition must support at least manual meal logging and hydration tracking with local persistence.
- Fitness must support workout completion/start/logging with local persistence.
- Schedule must support habit completion and medication taken/skipped state with local persistence.
- Medication reminders need a minimal real tracker model; notification scheduling can be beta-critical if reminders are marketed.
- Profile must support edit/save for basic account/profile fields.
- Settings/privacy/account deletion/export must have at least a minimal compliant path or clearly scoped beta limitation.
- Device sync must be verified on Android with Health Connect permissions/no-data/fallback/reconnect states.
- Auth must be verified end-to-end on the beta backend, including session persistence and logout.

Not beta-blocking if explicitly scoped out:

- Calendar integration.
- Advanced report exports.
- Voice assistant.
- File attachments.
- Food scanning.
- Full sleep workflow.

## 10. Recommended Phase 4C implementation subphases

1. Phase 4C-2: Core local interaction/persistence layer
   - Add minimal local stores and persistence for nutrition logs, hydration, workouts, habits, medications, and appointments.
   - Prefer AsyncStorage first if backend scope is not ready.

2. Phase 4C-3: Nutrition functionality
   - Manual meal logging, edit/delete meal, calorie/macros recalculation, hydration tracking.

3. Phase 4C-4: Schedule, habits, and medication tracker
   - Habit toggle/add/edit/delete.
   - Medication add/edit/delete and mark taken/skipped.
   - Prepare notification data model.

4. Phase 4C-5: Fitness planner functionality
   - Start/complete workout, log exercise, persist workout status, connect to Health Connect summary where possible.

5. Phase 4C-6: Profile/settings/privacy hardening
   - Profile edit, account settings, data export/delete request UX, account deletion decision, consent/permissions page.

6. Phase 4C-7: Notifications and reminders
   - Add notification package/config, permission flow, local scheduling for meds/habits/appointments if approved.

7. Phase 4C-8: Dynamic AI insights and daily briefing surface
   - Render daily briefing and AI insights on dashboard/profile, using existing engines.

8. Phase 4C-9: Reports/analytics and beta QA
   - Add basic weekly summary/report screen or export.
   - Run end-to-end device QA.

## 11. P0/P1/P2/P3 priority table

| Priority | Items |
|---|---|
| P0 | Auth device/backend verification; Health Connect verification; nutrition meal/hydration logging; fitness workout completion/logging; habit completion; medication tracker; basic profile edit; settings/privacy/account deletion/export plan |
| P1 | Dynamic dashboard data replacement; daily briefing UI; AI insight UI; cloud Medibot verification; report summary/export MVP; sleep navigation/detail workflow |
| P2 | Calendar integration; forgot-password backend flow; advanced notification scheduling; food scanning; AI meal plan persistence; appointment CRUD if calendar deferred |
| P3 | Separate Diet screen alias cleanup; voice assistant; file attachments; advanced analytics; wearable provider expansion beyond current plugins |

## 12. Risks and assumptions

- Assumption: Phase 4B polish is accepted and should not be changed during Phase 4C unless a UI issue blocks functionality.
- Risk: Beautiful mock-backed screens may appear beta-ready but fail user expectations when taps only show placeholder alerts.
- Risk: Health Connect functionality depends on real Android device/emulator state, installed Health Connect, permissions, and available records.
- Risk: OpenAI provider depends on backend env configuration and authenticated API availability.
- Risk: Adding backend CRUD for every domain could expand Phase 4C too much; local persistence MVP may be more realistic for beta.
- Risk: Settings/privacy/account deletion may carry legal/product implications and should be explicitly scoped before implementation.
- Risk: Notifications require package/config additions and permission UX; they should be planned carefully before release builds.

## 13. Suggested next Codex prompt for Phase 4C-2

Proceed with Phase 4C-2 for Healthy You.

Goal: implement the minimum local interaction and persistence foundation needed to replace placeholder screen actions with real beta-ready workflows.

Scope:

- Do not redesign UI.
- Do not change AI provider architecture.
- Add local persisted stores/helpers for:
  - nutrition meal logs and hydration
  - fitness workout status/logging
  - schedule habits
  - medication reminders/status
- Use AsyncStorage unless an existing backend endpoint already fits.
- Wire only the smallest necessary screen actions so existing cards can update state.
- Keep changes tightly scoped and document validation.

Start with Nutrition first if a narrower slice is needed:

- Manual meal add/edit/delete
- Hydration quick add
- Recalculate calories/macros from persisted meals where practical
- Preserve existing card design

Validation:

- `npx.cmd tsc --noEmit`
- `npm.cmd run typecheck`
- `git diff --check`

## Final answers

Are we ready for beta from a functionality standpoint?

No. The runtime and AI/device/auth foundations are strong, but too many visible user workflows are still mock/static or placeholder-only.

If not, what are the P0 blockers?

- Real nutrition logging/hydration tracking.
- Real fitness workout completion/logging.
- Real habit and medication tracker interactions.
- Basic profile edit/settings/privacy/account deletion/export coverage.
- Android Health Connect and auth end-to-end verification.
- Notification/reminder foundation if reminders are part of beta expectations.

What should Phase 4C-2 implement first?

Phase 4C-2 should implement the local persisted interaction foundation, starting with Nutrition meal logging and hydration because those are high-visibility, currently placeholder-only, and can establish the store/persistence pattern for Fitness, Schedule, Habits, and Medications.

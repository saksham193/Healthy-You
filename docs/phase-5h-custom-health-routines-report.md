# Phase 5H — Custom Health Routines

## Summary

Phase 5H adds local custom medication and habit routines to the Schedule screen. Users can create, edit, and delete routines; choose a reminder time; and enable or disable daily local reminders. Custom routine details remain in the existing local schedule store and are not sent to a backend.

## Starting checkpoint

- Last committed tag: v0.33.0-alpha
- Phase 5F implemented locally, runtime QA deferred
- Phase 5G implemented locally, runtime QA deferred
- Phase 5H built on combined WIP

## Scope

- local custom medication routine creation
- local custom habit routine creation
- local edit and delete controls
- reminder time entry and validation
- reminder enable and disable controls
- safe local reminder scheduling, cancellation, and rescheduling
- Profile clear-all reminders integration
- no backend or cloud sync

## Implementation

- custom medication routines: supported with a required name, optional user-entered medication label, optional note, and optional local reminder
- custom habit routines: supported with a required name, optional note, and optional local reminder
- edit/delete: existing custom routines can be edited; deletion requires confirmation and cancels the associated reminder
- reminder enable/disable: available in the routine form and on each saved routine card
- reminder time selection: accepts a valid time and normalizes it to 24-hour `HH:mm` storage
- local storage/state behavior: routines use the existing persisted Zustand schedule store backed by AsyncStorage
- migration behavior: existing schedule data without a `customRoutines` field loads with an empty routine list
- clear local wellness logs: continues clearing logs while preserving user-created routine definitions

## Reminder behavior

- schedule: enabled routines schedule a daily local notification through the existing reminder scheduler
- cancel: disabling or deleting a routine cancels its stored notification ID and removes its reminder record
- reschedule: edits create and persist the replacement notification before canceling the previous notification, preserving the old reminder if replacement creation fails
- clear all reminders integration: Profile clear-all cancels custom routine notifications and turns off custom routine reminder state
- privacy-safe OS notification copy: title is `Healthy You reminder`; body is `Time to check your wellness routine.`
- notification data contains a generated routine ID and generic routine title, not the routine name, medication label, note, dosage, or condition

## Privacy and safety

- custom routines are local-only
- no backend sync or account-based cloud storage
- no sensitive notification text
- no dosage advice or dosage validation
- no diagnosis or treatment claims
- no AI-created routines
- user-controlled edit and delete
- no new package or Android permission
- `RECORD_AUDIO` remains absent

## Regression coverage

- Phase 5F attachment flow preserved
- Phase 5G voice deferred fallback preserved
- Food Scan preserved
- Medibot typed chat preserved
- existing medication, habit, and hydration reminders preserved
- Profile clear local wellness logs preserved
- calendar preserved

## Validation

- `npm.cmd run backend:build`: passed
- `npx.cmd tsc --noEmit`: passed
- `npm.cmd run typecheck`: passed
- `git diff --check`: passed with expected LF-to-CRLF warnings only
- `npm.cmd run build:android:rc:local`: passed after Gradle network access was allowed
- clean rebuild note: the initial incremental build retained stale packaged assets; generated build outputs were cleaned and the RC build was rerun successfully so the APK includes Phase 5H
- RC1 APK SHA256: `839E578ED14461856AC002227FC093C10211A301450023B296FF119BC75FB367`
- RC2 blocker-fix APK SHA256: `FD56EEC526C82EB8B544972B43564356A5678340D629A4DEFC95276E2AE38137`
- ABI verification: `native-code: 'arm64-v8a' 'x86_64'`
- SDK verification: `sdkVersion:'26'`, `targetSdkVersion:'35'`
- permission verification: existing `CAMERA`, `READ_CALENDAR`, `WRITE_CALENDAR`, and `POST_NOTIFICATIONS` permissions are present
- `RECORD_AUDIO` absent: passed
- no Phase 5H permission was added

## Initial Mi phone QA

Initial Mi phone QA found P1 blockers in custom routine reminder enable/reschedule/disable and outdated Add Reminder quick action. RC2 Mi phone runtime QA confirmed those blockers are fixed.

Passed in the initial device run:

- install, launch, and crash-free operation
- routine persistence after restart
- custom medication and habit creation
- routine edit and confirmed delete
- empty-name and reminder-time validation
- Profile clear-all reminders synchronization
- existing medication, habit, and hydration reminders
- Phase 5F attachment foundation and typed Medibot chat
- Food Scan fallback/manual logging and calendar-safe behavior
- Voice deferred button behavior passed when the safe unavailable dialog appeared without microphone permission or recording.

RC2 fix pass:

- custom routine cards now use a full-row Android switch target with immediate pending state
- successful schedules persist the native notification identifier with the routine
- denied permission or invalid time leaves the routine reminder disabled
- rescheduling replaces the notification before cancelling stale identifiers
- disabling and deleting cancel both central reminder mapping and routine notification metadata
- Add Reminder now offers medication or habit routine creation instead of deferred beta copy

RC2 user-confirmed results:

- install successful: Yes
- app opened: Yes
- crash: No
- Add Reminder quick action opens new routine flow: Yes
- old "coming after beta" Add Reminder message removed: Yes
- enable custom reminder works: Yes
- reschedule custom reminder works: Yes
- disable custom reminder works: Yes
- Profile clear-all reminders turns custom toggles off: Yes
- notification text privacy-safe: implementation verified; not manually checked in notification shade
- voice deferred dialog works: Yes
- no microphone permission prompt: Yes
- Medibot attachment flow still works: Yes
- Food Scan fallback still works: Yes
- existing reminders still work: Yes
- logcat fatal errors: not checked because ADB/logcat was unavailable, but no visible crash occurred

Fixed RC1 P1 blockers:

- custom reminder enable
- custom reminder reschedule
- custom reminder disable
- stale Add Reminder "coming after beta" quick-action copy

## Runtime QA checklist

RC2 Mi phone runtime QA passed with user confirmation.

- custom reminder enable: passed
- custom reminder reschedule: passed
- custom reminder disable: passed
- Add Reminder quick action routing: passed
- stale Add Reminder deferred beta copy removed: passed
- Profile clear-all reminders turns custom routine toggles off: passed
- notification title/body privacy: implementation verified; notification shade not manually checked
- existing reminder regression: passed
- Phase 5F attachment regression: passed
- Phase 5G voice deferred regression: passed
- Food Scan fallback regression: passed
- visible runtime crash check: passed
- logcat: not checked because ADB/logcat was unavailable

Notification shade text was not manually checked, but implementation was verified to use privacy-safe generic text only:

- title: `Healthy You reminder`
- body: `Time to check your wellness routine.`

Logcat was not checked because ADB/logcat was unavailable. No visible runtime crash occurred during RC2 QA.

## Result

Passed after user-confirmed RC2 Mi phone runtime QA.

No P0/P1 blockers remain.

Phase 5F, 5G, 5H, and 5I can close.

## Files changed

- `src/types/index.ts`
- `src/store/scheduleStore.ts`
- `src/services/notifications/reminderScheduler.ts`
- `src/components/schedule/CustomRoutineCard.tsx`
- `src/screens/Schedule/ScheduleScreen.tsx`
- `src/screens/Profile/ProfileScreen.tsx`
- `docs/phase-5f-medibot-attachment-analysis-foundation-report.md`
- `docs/phase-5g-voice-input-speech-to-text-foundation-report.md`
- `docs/phase-5h-custom-health-routines-report.md`

## Next phase

Phase 5I — Phase 5 Consolidated QA

# Phase 5B/5C Real-Device QA Fix Report

Date: July 9, 2026

## Scope

This pass stabilized the existing Phase 5B/5C WIP after manual QA on a Mi phone. No commit was made, nothing was staged, no packages were added, and backend/auth/AI provider architecture was not changed.

Requested backup created:

```text
phase5b_5c_real_device_qa_fix_backup.patch
```

## Manual QA Findings

Passed before this fix pass:

- Real-device install.
- App open.
- Login/session.
- No crash.
- Medibot typed message.
- Food Scan image picker/camera opened and captured or selected photo.
- Attachment picker opened.
- Hydration reminder was tested.
- Voice safe deferred message displayed correctly.

Broken or partial before this fix pass:

- Notification permission flow was unclear.
- Medication reminder schedule/cancel did not work clearly.
- Habit reminder schedule/cancel did not work clearly.
- Clear all reminders did not work reliably.
- Calendar add event showed broad calendar unavailable copy.
- Food Scan manual logging handoff was partial.
- Attachment banner/safe copy was partial.
- Fitness Manual Workout Summary cards clipped text on a real phone.

## Fixes Made

- Added exact denied notification copy: `Notifications are disabled. Enable notifications in Android settings to use reminders.`
- Clarified notification status labels on Schedule and Profile.
- Kept local notification title/body generic:
  - `Healthy You reminder`
  - `Time to check your wellness routine.`
- Hardened Profile clear-all reminder cancellation against stale local reminder storage.
- Clarified Schedule quick actions so custom setup remains deferred while card-level `Daily reminder` buttons are the implemented reminder path.
- Switched calendar service to `expo-calendar/legacy` for the async APIs already used by this WIP.
- Added exact calendar denied/no-writable messages.
- Kept calendar event title generic: `Healthy You wellness appointment`.
- Opened the meal logging modal from Food Scan `Log Manually` with a `Photo meal draft` and safe notes only.
- Expanded Medibot attachment banner with filename/type/size and explicit no-upload/no-analysis copy.
- Increased Manual Workout Summary card footprint to reduce real-device clipping.

## Validation

Commands run:

```powershell
npx.cmd tsc --noEmit
npm.cmd run typecheck
git diff --check
npm.cmd run build:android:rc:local
aapt dump badging android\app\build\outputs\apk\release\app-release.apk
aapt dump permissions android\app\build\outputs\apk\release\app-release.apk
Get-FileHash android\app\build\outputs\apk\release\app-release.apk -Algorithm SHA256
adb devices
```

Results:

- `npx.cmd tsc --noEmit`: passed using Cursor helper Node on PATH.
- `npm.cmd run typecheck`: passed.
- `git diff --check`: passed, with Windows CRLF warnings only.
- `npm.cmd run build:android:rc:local`: passed after network approval for Gradle distribution download.
- Runtime QA: completed manually on a Mi phone and passed.

APK:

- Path: `android\app\build\outputs\apk\release\app-release.apk`
- SHA256: `453862268ECA9029F37458D2443D6DD2A5BA44BD903095A4B280217BF5F03194`
- Size: `53,865,404` bytes.
- Supported ABIs: `arm64-v8a`, `x86_64`.

Permissions confirmed by `aapt`:

- Present: `android.permission.POST_NOTIFICATIONS`
- Present: `android.permission.CAMERA`
- Present: `android.permission.READ_CALENDAR`
- Present: `android.permission.WRITE_CALENDAR`
- Not present: `android.permission.RECORD_AUDIO`

## Final Real-Device QA Result

Final retest was completed manually on a Mi phone.

- APK installed successfully: passed.
- App opened: passed.
- Login/session: passed.
- Any crash: none observed.
- Notification permission/status: passed.
- Medication reminder schedule/cancel: passed.
- Habit reminder schedule/cancel: passed.
- Hydration reminder schedule/cancel: passed.
- Clear all reminders: passed.
- Food Scan `Log Manually` opened meal modal: passed.
- Attachment banner/safe copy: passed.
- Voice deferred message: passed.
- Calendar add/safe failure: passed.
- Fitness cards readable: passed.
- Medibot typed message still works: passed.

Clarification from screenshot review:

- Food Scan passed because it opened the Log Meal modal with `Photo meal draft`.
- Attachment passed because the banner showed filename/type/size and no-upload/no-analysis copy.
- Voice passed because it showed `Voice transcription deferred` copy.

## Close Decision

Phase 5B/5C real-device QA passed. No P0/P1 blockers remain. Phase 5B/5C can close.

Remaining limitations are intentional beta-safe deferred items:

- Voice STT remains deferred.
- AI food recognition remains deferred.
- Attachment upload/analysis remains deferred.
- Custom medication/habit setup/edit remains after beta.
- Calendar may safely fail if no writable calendar exists.

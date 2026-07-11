# Phase 6D - Conflict Review UI and Broader Entity Sync Wiring

## Summary

Phase 6D adds a safe conflict review surface for the local manual sync queue and expands queue wiring for additional stable local wellness entities. Sync remains explicit and manual-only.

No automatic sync, background sync, hidden upload, server merge, or silent local overwrite was added.

## Starting checkpoint

- Last committed commit: ebc47a3d8e366791a786ceec2981d1ab0173acda
- Last committed tag: v0.37.0-alpha
- Phase 6C implemented locally, RC2 runtime QA deferred
- Phase 6D built on top of Phase 6C WIP

## Scope

- conflict review UI
- broader safe entity queue wiring
- no automatic sync
- no background sync
- no silent overwrite

## Existing Phase 6C state

- Profile/Data Controls had a manual Cloud Sync section.
- The local queue persisted pending and conflict items in AsyncStorage.
- Manual sync skipped existing conflict items and did not apply server records to local stores.
- The RC2 fitness logging regression fix was already staged.
- Phase 6C Android runtime QA remains deferred.

## Conflict review implementation

- Profile/Data Controls now exposes a conflict review action.
- The Cloud Sync panel shows queued count, conflict count, and supported local record count.
- Conflict review lists conflict queue items and shows safe metadata only:
  - entity type
  - operation
  - local updated time
  - queued time
  - last attempt time
  - conflict reason
  - server updated time when supplied
- Payload values are hidden in the review UI.
- Available actions:
  - Retry later: closes review and leaves the queue unchanged.
  - Keep local and retry: moves the queue item from conflict to pending for a future explicit Sync now tap.
  - Remove from queue: removes only the queue item after confirmation.
  - Close: leaves local data and queue state unchanged.
- Removing or retrying a queue item does not delete nutrition, hydration, fitness, habit, medication, routine, or profile records.
- No server version is applied automatically.

## Broader entity coverage

Entities already queued by Phase 6C:

- `nutrition_log`
- `fitness_log`
- `schedule_routine`
- `profile_settings`

Entities newly wired in Phase 6D:

- `hydration_log`
- `habit_completion`
- `medication_log`

Entities deferred:

- files
- images
- audio
- attachments
- AI prompts/responses
- raw medical documents
- notification text
- tokens/secrets

Unsupported data types:

- raw food scan media
- Medibot attachment contents
- voice/audio data
- full document contents
- backend secrets or auth tokens

## Feature flags

- `CLOUD_SYNC_ENABLED = false`
- `CLOUD_SYNC_MANUAL_SYNC_ENABLED = true`
- `CLOUD_SYNC_AUTO_UPLOAD_ENABLED = false`
- `CLOUD_SYNC_BACKGROUND_SYNC_ENABLED = false`

## Privacy and safety

- explicit user action required
- no hidden upload
- no raw file/image/audio sync
- no sensitive payload logging
- no automatic overwrite on conflict
- local/offline-first behavior preserved
- no diagnosis, treatment, or medical recommendation logic added
- no new mobile permissions
- `RECORD_AUDIO` remains absent

## Validation

- `npm.cmd run backend:build`: passed
- `npx.cmd tsc --noEmit`: passed
- `npm.cmd run typecheck`: passed
- `git diff --check`: passed with CRLF normalization warnings only
- `npm.cmd run build:android:rc:local`: passed after allowing Gradle network access
- APK SHA256: `70E5751A62BD3D891D7F0B050D770F5C63DAA2E672DD8C5B65AFD97346D0D680`
- QA APK copy: `C:\Users\SAKSHAM GUPTA\Desktop\healthy-you-apk-feedback\HealthyYou-Phase6C-6D-Sync-QA-RC1.apk`
- QA APK SHA256: `70E5751A62BD3D891D7F0B050D770F5C63DAA2E672DD8C5B65AFD97346D0D680`
- ABI verification: `native-code: 'arm64-v8a' 'x86_64'`
- SDK verification: `sdkVersion:'26'`, `targetSdkVersion:'35'`
- Permission verification: existing `CAMERA`, `READ_CALENDAR`, `WRITE_CALENDAR`, `READ_EXTERNAL_STORAGE` maxSdk 32, `WRITE_EXTERNAL_STORAGE` maxSdk 32, and `POST_NOTIFICATIONS` permissions are present
- `RECORD_AUDIO` absent: passed
- no new Phase 6D mobile permission was added

## Runtime QA checklist

Final combined Android runtime QA:

- install successful: Yes
- app opens: Yes
- no crash: Yes
- Cloud Sync section visible: Yes
- manual Sync now remains explicit: Yes
- no sync happens automatically on screen open: Yes
- failed/unavailable sync fallback safe: Yes
- conflict review UI safe: Yes
- nutrition logging still works: Yes
- hydration logging still works: Yes
- fitness workout logging works after RC2 fix pass: Yes
- habit/medication logs still work: Yes
- custom routines/reminders still work: Yes
- Medibot/attachment/voice fallback still works: Yes
- Food Scan fallback/manual logging still works: Yes
- calendar safe behavior still works: Yes
- `RECORD_AUDIO` absent: Yes
- no new permission prompt: Yes

The RC2 fitness/See All runtime fix pass resolved the P1 blocker. Start Workout, workout timer, manual exercise logging, custom workout plans, workout completion, and See All buttons passed Android retest.

Logcat was not checked because ADB/logcat was unavailable. No visible runtime crash occurred during Android QA.

## Result

Passed after user-confirmed Android runtime QA.

No P0/P1 blockers remain. Phase 6D can close.

## Files changed

- `README.md`
- `backend/src/types/contracts.ts`
- `docs/phase-6c-offline-first-mobile-sync-queue-manual-sync-report.md`
- `docs/phase-6d-conflict-review-broader-sync-wiring-report.md`
- `src/screens/Profile/ProfileScreen.tsx`
- `src/services/sync/syncPayloads.ts`
- `src/services/sync/syncQueue.ts`
- `src/services/sync/syncTypes.ts`
- `src/store/nutritionStore.ts`
- `src/store/scheduleStore.ts`

## Next phase

Phase 6E - Account deletion/export hardening and sync QA closure

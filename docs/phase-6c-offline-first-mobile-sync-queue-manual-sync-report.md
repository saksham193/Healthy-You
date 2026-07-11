# Phase 6C - Offline-first Mobile Sync Queue and Explicit Manual Sync

## Summary

Phase 6C adds the mobile-side offline-first sync queue foundation and a Profile/Data Controls manual sync action. Supported local changes can be queued on-device and are only pushed after the user taps Sync now.

Automatic sync, background sync, file/image/audio/attachment sync, and silent local overwrite remain disabled.

## Starting checkpoint

- commit: ebc47a3d8e366791a786ceec2981d1ab0173acda
- tag: v0.37.0-alpha

## Scope

- offline-first mobile queue
- explicit manual sync
- no automatic sync
- no background sync

## Existing audit

### Sync service/queue

- `src/services/sync/syncFeatureFlags.ts` kept automatic and background sync disabled.
- `src/services/sync/syncQueue.ts` previously returned an empty queue while cloud sync was globally disabled.
- `src/services/sync/syncService.ts` flushed accepted items and kept non-accepted items queued.
- `src/services/sync/syncApi.ts` routed push/pull through authenticated backend APIs.

### API client/auth

- `src/services/api/ApiClient.ts` supports authenticated requests, timeout handling, refresh-token retry, and controlled `ApiRequestError` responses.
- `src/store/authStore.ts` restores saved sessions and handles backend-unavailable fallback without exposing tokens.

### Nutrition store

- `src/store/nutritionStore.ts` stores meals and hydration locally in AsyncStorage.
- Phase 6C queues safe meal create/update/delete records only. Hydration logs are not queued in this phase.

### Fitness store

- `src/store/fitnessStore.ts` stores workout completions locally in AsyncStorage.
- Phase 6C queues workout completion create/delete records.

### Schedule/custom routines store

- `src/store/scheduleStore.ts` stores habit completions, medication logs, and custom routines locally in AsyncStorage.
- Phase 6C queues custom routine create/update/delete records only. Habit completion logs and medication logs remain local-only in this phase.

### Profile/data controls

- `src/screens/Profile/ProfileScreen.tsx` already contains Privacy & Data controls for local export, local data clearing, reminder clearing, and beta account deletion messaging.
- Phase 6C adds a Cloud Sync manual action in this existing area.

## Implementation

### Queue behavior

- local queue entries persist in AsyncStorage under `healthy-you.cloud-sync.queue-v1`
- queue entries are capped at 100 items
- queue entries dedupe by entity type and entity ID
- accepted items are removed after manual push
- failed items stay queued and retry count is incremented
- conflict items stay queued with local conflict metadata
- delete operations are queued as tombstones

### Manual sync UI

Profile/Data Controls now includes a Cloud Sync section with:

- explicit manual-only sync copy
- Sync now button
- queued count
- conflict count
- supported local record count
- auto-upload and background-sync flag status

### Sync status

The UI can show:

- Sync is disabled in this build.
- Sign in is required before cloud sync.
- Syncing...
- Sync complete.
- Sync failed. Your data is still saved locally.
- Some changes need review before they can sync. Your local data was not overwritten.
- queued change counts

### Error/fallback behavior

- unauthenticated users see a sign-in-required fallback
- backend/network failures keep queue items locally
- rejected or failed items stay pending
- conflicts are marked for later review instead of overwriting local data

### Conflict handling

Backend conflict responses are kept in the local queue with `queueStatus: "conflict"`. The app does not overwrite local data or apply server records in Phase 6C. Deeper conflict review remains Phase 6D.

### Entity coverage

Queued for manual sync:

- `nutrition_log`: meal logs only, excluding raw images and meal notes
- `fitness_log`: workout completions, excluding notes
- `schedule_routine`: custom routines
- `profile_settings`: local display name and primary goal only

Not synced:

- raw food images
- AI image prompts/responses
- Medibot attachments
- audio
- document contents
- notification message text
- API secrets/tokens
- hydration logs
- habit completion logs
- medication logs

## Feature flags

- `CLOUD_SYNC_ENABLED = false`
- `CLOUD_SYNC_MANUAL_SYNC_ENABLED = true`
- `CLOUD_SYNC_AUTO_UPLOAD_ENABLED = false`
- `CLOUD_SYNC_BACKGROUND_SYNC_ENABLED = false`

Manual sync uses the manual flag and an explicit Profile button. Existing automatic/background gates remain off.

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
- `git diff --check`: passed with expected CRLF warnings only
- `npm.cmd run build:android:rc:local`: passed after allowing Gradle network access
- APK SHA256: `C576CD65CEE926D689D1CEC92657CA319B93AE66E0D72459F967C51432C004FA`
- QA APK copy: `C:\Users\SAKSHAM GUPTA\Desktop\healthy-you-apk-feedback\HealthyYou-Phase6C-Manual-Sync-QA-RC1.apk`
- QA APK SHA256: `C576CD65CEE926D689D1CEC92657CA319B93AE66E0D72459F967C51432C004FA`
- ABI verification: `native-code: 'arm64-v8a' 'x86_64'`
- SDK verification: `sdkVersion:'26'`, `targetSdkVersion:'35'`
- Permission verification: existing `CAMERA`, `READ_CALENDAR`, `WRITE_CALENDAR`, and `POST_NOTIFICATIONS` permissions are present
- `RECORD_AUDIO` absent: passed
- no new Phase 6C mobile permission was added

## Runtime QA checklist

Final Android runtime QA passed after the RC2 fitness/See All fix pass.

- install successful: Yes
- app opens: Yes
- no crash: Yes
- Cloud Sync visible: Yes
- Sync Now manual only: Yes
- no auto-sync on screen open: Yes
- safe fallback if sync unavailable: Yes
- nutrition logging still works: Yes
- Food Scan fallback/manual logging still works: Yes
- custom routines/reminders work: Yes
- Medibot typed message works: Yes
- attachment flow works: Yes
- voice fallback works without mic permission: Yes
- calendar safe behavior works: Yes
- `RECORD_AUDIO` absent: Yes
- no new permission prompt: Yes

The RC2 fitness/See All runtime fix pass resolved the P1 blocker. Start Workout, workout timer, manual exercise logging, custom workout plans, workout completion, and See All buttons passed Android retest.

Logcat was not checked because ADB/logcat was unavailable. No visible runtime crash occurred during Android QA.

## Result

Passed after user-confirmed Android runtime QA.

No P0/P1 blockers remain. Phase 6C can close.

## Files changed

- `README.md`
- `docs/phase-6c-offline-first-mobile-sync-queue-manual-sync-report.md`
- `src/screens/Profile/ProfileScreen.tsx`
- `src/services/sync/syncApi.ts`
- `src/services/sync/syncFeatureFlags.ts`
- `src/services/sync/syncPayloads.ts`
- `src/services/sync/syncQueue.ts`
- `src/services/sync/syncService.ts`
- `src/services/sync/syncTypes.ts`
- `src/store/fitnessStore.ts`
- `src/store/nutritionStore.ts`
- `src/store/profileSettingsStore.ts`
- `src/store/scheduleStore.ts`

## Next phase

Phase 6D - Conflict review UI and broader entity sync wiring

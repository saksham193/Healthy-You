# Phase 6A — Cloud Sync Architecture, Data Contracts, and Backend Readiness

## Summary

Phase 6A starts the cloud sync phase with a safe architecture and contract foundation only. It defines generic sync contracts, adds authenticated backend placeholder endpoints, adds a disabled-by-default frontend sync foundation, and gates existing cloud helper paths so the app does not auto-upload local health data while production sync consent, persistence, and conflict handling remain unfinished.

This phase does not implement full production sync, background sync, account deletion, file export, raw media upload, or live conflict resolution.

## Starting checkpoint

- commit: 01f383f
- tag: v0.35.0-alpha
- release state: app icon branding update complete
- working tree: clean before Phase 6A implementation

## Scope

- architecture/contracts/foundation only
- no automatic sync
- no production persistence for generic nutrition, fitness, schedule, or profile-settings sync
- no background sync
- no raw image, file, attachment, or audio upload
- no new app permissions
- no package additions

## Existing local data audit

### Nutrition

- store: `src/store/nutritionStore.ts`
- persistence: AsyncStorage key `healthy-you.nutrition.local-v1`
- data: meal logs and hydration logs
- behavior: local create, update, delete, hydration reset, and clear-all
- sync status: local-only for Phase 6A; no generic nutrition upload is enabled

### Fitness

- store: `src/store/fitnessStore.ts`
- persistence: AsyncStorage key `healthy-you.fitness.local-v1`
- data: workout completion records
- behavior: local completion, delete, today-completion delete, and clear-all
- sync status: local-only for Phase 6A; no generic fitness upload is enabled

### Schedule/custom routines

- store: `src/store/scheduleStore.ts`
- persistence: AsyncStorage key `healthy-you.schedule.local-v1`
- data: habit completions, medication logs, and custom medication/habit routines
- behavior: local habit/medication logging, custom routine create/edit/delete, reminder metadata, and clear-all that preserves routine definitions
- sync status: local-only for Phase 6A; no generic schedule or custom routine upload is enabled

### Profile/settings

- store: `src/store/profileSettingsStore.ts`
- persistence: AsyncStorage key `healthy-you.profile.display-v1`
- data: local display profile fields such as name, age, height, weight, and primary goal
- existing cloud helper: `src/services/profile/ProfileCloudSync.ts`
- Phase 6A behavior: existing profile cloud helper is gated by `CLOUD_SYNC_ENABLED = false`; profile cache may remain local, but network sync and queueing are disabled by default

### Local export/data controls

- screen: `src/screens/Profile/ProfileScreen.tsx`
- current behavior: local export preview only; not a cloud export or account deletion receipt
- account deletion: deferred; no backend deletion guarantee is claimed

## Backend audit

### Routes

- `backend/src/app.ts` mounts status, auth, user, AI, memory, profile, and sync routes.
- Existing sync route: `/sync/health-summary`
- Existing profile route: `/profile`
- Phase 6A added generic placeholders under `/sync/push` and `/sync/pull`.

### Controllers

- Existing controllers return `{ data: ... }` envelopes.
- Existing auth-required controllers read `request.auth` and throw `missing_auth_context` when absent.
- Phase 6A follows the same controller pattern for `SyncController`.

### Services

- Existing `HealthSummarySyncService` persists aggregate health summaries.
- Existing `ProfileSyncService` persists profile JSON.
- Phase 6A added `SyncService` for generic sync readiness only; it returns `not_enabled` responses and does not persist payloads.

### Auth middleware

- `requireAuth` validates bearer access tokens and sets `request.auth`.
- Phase 6A generic sync endpoints require auth.

### Persistence/database readiness

- backend uses SQLite via `better-sqlite3`.
- Existing tables support users, refresh tokens, memories, health profiles, and health summaries.
- There is no production-ready generic sync table for nutrition, fitness, schedule routines, conflict records, or account deletion audit in Phase 6A.

### Error handling pattern

- `HttpError` and `errorHandler` provide controlled error responses.
- request logger records method/path/status/duration only, not request bodies.
- Phase 6A does not log sync payloads.

## Data contracts

### Sync entity types

- `nutrition_log`
- `fitness_log`
- `schedule_routine`
- `profile_settings`

### Sync operations

- `create`
- `update`
- `delete`

### Sync queue item

Defined in backend contracts and frontend sync types:

- `id`
- `entityType`
- `entityId`
- `operation`
- `payload`
- `localUpdatedAt`
- `queuedAt`
- `retryCount`

### Sync response

- `accepted`
- `conflict`
- `rejected`
- `not_enabled`

### Profile model

Phase 6A defines a safe `CloudProfileSettings` foundation with:

- optional display name
- app preferences
- privacy settings
- sync consent status
- explicit false values for raw media sync and background sync
- `updatedAt`

### Conflict shape

The sync response supports a future conflict object with:

- entity type
- entity ID
- reason

No live conflict mutation is implemented in Phase 6A.

## Backend foundation

Routes added:

- `POST /sync/push`
- `GET /sync/pull`

Placeholder behavior:

- requires authentication
- validates `/sync/push` request shape
- returns HTTP `501`
- returns contract-compatible `status: "not_enabled"` and `code: "sync_not_enabled"`
- does not persist sync queue payloads
- does not write nutrition, fitness, schedule, or profile settings to generic sync storage

Validation/error behavior:

- invalid push payloads return existing `invalid_request` validation behavior
- unauthenticated requests return existing auth errors
- disabled sync returns controlled not-enabled responses

No sensitive logging:

- no request body logging
- no sync payload logging
- no nutrition, fitness, routine, medication, note, or profile-detail logging

Deferred backend work:

- generic sync persistence
- conflict resolution storage
- account deletion endpoint
- data export endpoint
- production profile settings sync

## Frontend foundation

Files added:

- `src/services/sync/syncFeatureFlags.ts`
- `src/services/sync/syncTypes.ts`
- `src/services/sync/syncApi.ts`
- `src/services/sync/syncQueue.ts`
- `src/services/sync/syncService.ts`

Disabled-by-default behavior:

- `CLOUD_SYNC_ENABLED = false`
- `CLOUD_SYNC_AUTO_UPLOAD_ENABLED = false`
- `CLOUD_SYNC_BACKGROUND_SYNC_ENABLED = false`
- sync API methods return local `not_enabled` responses while disabled
- sync queue read/enqueue/replace do not persist payloads while disabled
- queue flush returns `not_enabled` while disabled

Existing helper gates:

- profile cloud sync network calls are disabled by default
- health summary cloud backup/load network calls are disabled by default
- memory cloud queue/load/delete paths are disabled by default

No auto-upload:

- no startup generic sync
- no background worker
- no automatic nutrition, fitness, schedule, routine, attachment, file, image, or audio upload
- no server mutation of local records
- no server pull mutation of local records

## Privacy and safety

- cloud sync disabled by default
- no hidden upload
- no automatic upload
- no background sync
- no raw image/file/audio sync
- no attachment sync
- no sensitive payload logging
- no hidden data sharing
- no profile sync without explicit future consent
- no account deletion endpoint claiming to delete data that is not persisted yet
- no medical diagnosis or treatment claims
- local/offline app behavior remains the default

## Validation

- `npm.cmd run backend:build`: passed with the requested Node helper PATH
- `npx.cmd tsc --noEmit`: passed with the requested Node helper PATH
- `npm.cmd run typecheck`: passed with the requested Node helper PATH
- `git diff --check`: passed with expected LF-to-CRLF warnings only
- `npm.cmd run build:android:rc:local`: passed after allowing Gradle distribution network access
- APK SHA256: `E157339A3A32C5832A09EF5DF6BF6C0F712A750F7DD434184F9AD7A31D7F508E`
- ABI verification: `native-code: 'arm64-v8a' 'x86_64'`
- SDK verification: `sdkVersion:'26'`, `targetSdkVersion:'35'`
- Permission verification: existing `CAMERA`, `READ_CALENDAR`, `WRITE_CALENDAR`, and `POST_NOTIFICATIONS` permissions are present
- `RECORD_AUDIO` absent: passed
- no Phase 6A permission was added

## Result

Pending review. Automated validation passed; no runtime QA has been performed for Phase 6A.

## Files changed

- `backend/src/controllers/SyncController.ts`
- `backend/src/routes/syncRoutes.ts`
- `backend/src/services/SyncService.ts`
- `backend/src/types/contracts.ts`
- `src/services/health/HealthSummaryCloudSync.ts`
- `src/services/local-ai/OfflineMemoryQueue.ts`
- `src/services/profile/ProfileCloudSync.ts`
- `src/services/sync/syncApi.ts`
- `src/services/sync/syncFeatureFlags.ts`
- `src/services/sync/syncQueue.ts`
- `src/services/sync/syncService.ts`
- `src/services/sync/syncTypes.ts`
- `docs/phase-6a-cloud-sync-architecture-data-contracts-report.md`
- `README.md`

## Next phase

Phase 6B — Backend persistence and authenticated sync endpoints

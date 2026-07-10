# Phase 6B - Backend Persistence and Authenticated Sync Endpoints

## Summary

Phase 6B turns the Phase 6A generic sync placeholders into authenticated backend persistence endpoints. The backend can now accept, store, return, conflict-check, and tombstone generic sync entities for signed-in users.

Mobile automatic sync remains disabled by default. This phase does not add background sync, new mobile permissions, raw media upload, sensitive payload logging, diagnosis logic, or production consent UX.

## Starting checkpoint

- commit: 6b52912
- tag: v0.36.0-alpha
- release state: Phase 6A closed
- remote checkpoint: `origin/main` and `v0.36.0-alpha` point to `6b529123489549ea61d0989e56a3f54ebf1fc61e`
- working tree: clean before Phase 6B implementation

## Backend persistence

Phase 6B adds a generic `sync_entities` SQLite table:

- `user_id`
- `entity_type`
- `entity_id`
- `sync_item_id`
- `operation`
- `payload_json`
- `local_updated_at`
- `queued_at`
- `retry_count`
- `server_updated_at`
- `deleted_at`

Rows are scoped by authenticated user and keyed by `(user_id, entity_type, entity_id)`.

## Endpoints

`POST /sync/push`

- requires bearer authentication
- validates request body with the existing sync queue item contract
- persists `create`, `update`, and `delete` operations
- returns per-item `accepted` or `conflict` results
- rejects stale writes when a newer server version already exists
- stores delete operations as tombstones

`GET /sync/pull`

- requires bearer authentication
- returns persisted sync items for the authenticated user
- supports optional `updatedAfter` ISO cursor filtering
- rejects invalid cursors with `invalid_sync_cursor`

## Contracts

Phase 6B expands the generic sync response envelopes:

- push status: `ok`, `partial`, or `not_enabled`
- pull status: `ok` or `not_enabled`
- item status remains `accepted`, `conflict`, `rejected`, or `not_enabled`

The frontend type contracts were updated to understand backend-enabled responses, but frontend sync feature flags remain disabled.

## Privacy and safety guardrails

- no mobile automatic sync
- no background sync
- no automatic upload of health data
- no raw image, file, attachment, or audio sync
- no new mobile permissions
- no `RECORD_AUDIO`
- no sensitive sync payload logging
- request logging remains method/path/status/duration only
- no secrets or API keys exposed
- no medical diagnosis or treatment logic
- offline/local-first behavior remains the default

## Backend smoke coverage

Added `npm.cmd run backend:smoke:sync`, which uses a temporary SQLite database and verifies:

- unauthenticated pull returns 401
- authenticated user registration succeeds
- push returns 200 with accepted item
- pull returns persisted item
- stale update returns conflict
- delete operation creates a pullable tombstone

The smoke script prints pass/fail only and does not print sync payloads.

## Files changed

- `backend/src/controllers/SyncController.ts`
- `backend/src/database/connection.ts`
- `backend/src/repositories/SyncRepository.ts`
- `backend/src/services/SyncService.ts`
- `backend/src/types/contracts.ts`
- `src/services/sync/syncTypes.ts`
- `scripts/smoke-sync-endpoints.js`
- `package.json`
- `README.md`
- `docs/phase-6b-backend-persistence-authenticated-sync-endpoints-report.md`

## Result

Pending final validation, staged review, and user approval before commit.

# Phase 7B - Production Database and Migration Hardening

## Summary

Phase 7B hardens the backend SQLite persistence layer with a deterministic migration foundation, schema migration tracking, sync entity indexes, production database path validation, and migration smoke coverage.

This phase does not change mobile runtime behavior, does not enable automatic/background sync, and does not add mobile permissions.

## Starting checkpoint

- commit: 8d67dddd3b74366167dd7de2739b6735954b8e77
- tag: v0.38.0-alpha

## Scope

- backend database hardening
- migration readiness
- production DB configuration boundaries
- no mobile runtime behavior changes

## Existing database audit

- DB initialization:
  - `backend/src/database/connection.ts` opened the configured SQLite database, enabled WAL mode, enabled foreign keys, and created schema at app startup.
- Schema/migration pattern:
  - Tables were previously created imperatively inside `initializeDatabase()`.
  - Optional memory columns were added with guarded `ALTER TABLE` statements.
  - There was no `schema_migrations` table before Phase 7B.
- `sync_entities` table:
  - Rows are user-scoped with `user_id`.
  - Rows are keyed by `(user_id, entity_type, entity_id)`.
  - Payload JSON exists for backend sync storage, but request/smoke logging does not print payload values.
  - Export endpoints return metadata only.
- Indexes/constraints:
  - The primary key covered exact user/entity lookup.
  - Dedicated indexes for sync list/export cursor patterns were not present before Phase 7B.
- SQLite file/path behavior:
  - `DATABASE_URL` defaults to `file:backend/data/healthy-you.sqlite`.
  - `DATABASE_PATH` can override the resolved path.
  - Local DB files and SQLite WAL/SHM files are ignored by Git.
- Staging/production persistence assumptions:
  - Staging Render config uses `/var/data` persistent disk storage.
  - Production still requires explicit durable DB configuration and backup/restore runbooks.

## Implementation

- Added deterministic migrations in `backend/src/database/migrations.ts`.
- Added `schema_migrations` tracking through `backend/src/database/migrationRunner.ts`.
- Updated startup initialization to apply migrations through `runMigrations()`.
- Added non-destructive migrations:
  - initial backend schema
  - guarded memory optional columns
  - sync entity indexes
- Added sync indexes:
  - `idx_sync_entities_user_id`
  - `idx_sync_entities_user_server_updated`
  - `idx_sync_entities_user_entity_type`
  - `idx_sync_entities_user_local_updated`
  - `idx_sync_entities_user_deleted_at`
- Added migration CLI:
  - `npm.cmd run backend:migrate`
  - `npm.cmd run backend:migrate:status`
- Added migration smoke coverage:
  - `npm.cmd run backend:smoke:migrations`
- Startup migration behavior:
  - migrations run at backend startup through existing `initializeDatabase()`
  - failed migrations throw during startup instead of starting with a partially unknown schema
  - migration status output contains migration metadata only
- Non-destructive behavior:
  - no tables are dropped
  - no payload columns are removed
  - no existing sync rows are deleted

## Production readiness

- Persistent disk requirement:
  - production must use an explicit durable `DATABASE_URL` or `DATABASE_PATH`
  - production must not use the development default DB path
  - production must not point SQLite at a temp directory
- Backup expectations:
  - take a database backup before production migration
  - include SQLite WAL/SHM files when SQLite remains in WAL mode
  - verify restore in staging before production changes
- Staging verification:
  - run migrations and smoke tests in staging before production
  - verify `/health`, `/status`, and sync smoke after migration
- Rollback limitation:
  - Phase 7B adds forward-only non-destructive migrations
  - production rollback should restore the pre-migration database backup if needed
- DB file gitignore status:
  - `backend/data/`, `*.sqlite`, `*.sqlite-shm`, `*.sqlite-wal`, and `*.db` are ignored
- Secrets/config boundaries:
  - no secrets or real production DB paths were added to the repo
  - production config still belongs in deployment environment variables

## Privacy and safety

- no sensitive payload logging
- no raw file/image/audio storage added
- no destructive migration
- user-scoped sync records preserved
- local/offline mobile behavior unchanged
- automatic sync remains disabled
- background sync remains disabled
- `RECORD_AUDIO` remains absent

## Validation

- `npm.cmd run backend:build`: passed
- `npx.cmd tsc --noEmit`: passed
- `npm.cmd run typecheck`: passed
- `npm.cmd run backend:migrate`: passed; all migrations applied and zero pending
- `npm.cmd run backend:migrate:status`: passed; all migrations applied and zero pending
- `npm.cmd run backend:smoke:migrations`: passed
- `npm.cmd run backend:smoke:sync`: passed
- `git diff --check`: passed with CRLF normalization warnings only
- Android RC build: skipped because Phase 7B changed backend/database scripts and documentation only; no mobile runtime behavior changed

## Backend smoke results

- migration idempotency: passed; migration smoke runs migrations twice against a temporary SQLite database
- health/status: passed; migration smoke verifies `/health` and `/status`
- sync smoke: passed
- migration status: passed; `backend:migrate:status` reports applied migrations and zero pending migrations

## Result

Pending review. Implementation and automated validation are complete; commit/tag/push have not been performed.

## Files changed

- `backend/src/config/EnvValidator.ts`
- `backend/src/database/connection.ts`
- `backend/src/database/migrateCli.ts`
- `backend/src/database/migrationRunner.ts`
- `backend/src/database/migrations.ts`
- `package.json`
- `scripts/smoke-migrations.js`
- `docs/phase-7b-production-database-migration-hardening-report.md`
- `README.md`

## Next phase

Phase 7C - Rate Limiting and Request Hardening

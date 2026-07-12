# Phase 7E - Backup, Rollback, and Production Deployment Checklist

## Summary

Phase 7E prepares production-safe backup, rollback, and deployment readiness for the Healthy You backend. It adds an explicit local SQLite backup helper, a backup smoke test that uses temporary local data only, stronger backup artifact ignores, and a production deployment checklist that keeps restore operations documentation-first.

This phase does not deploy to production, does not add automatic backups, does not implement a destructive restore script, and does not change mobile runtime behavior.

## Starting checkpoint

- commit: 114b4f69e0edf191647efe0da72deaf106eba3c3
- tag: v0.41.0-alpha

## Scope

- SQLite backup readiness
- rollback planning
- production deployment checklist
- backup smoke coverage
- no mobile runtime behavior changes
- no production deployment performed

## Existing readiness audit

- DB path/config:
  - `DATABASE_URL` defaults to `file:backend/data/healthy-you.sqlite`.
  - `DATABASE_PATH` can override the resolved path.
  - production validation requires an explicit durable database location and rejects temporary production locations.
- migration scripts:
  - `npm.cmd run backend:migrate`
  - `npm.cmd run backend:migrate:status`
  - startup migrations run through the existing migration runner.
- smoke scripts:
  - `npm.cmd run backend:smoke:migrations`
  - `npm.cmd run backend:smoke:sync`
  - `npm.cmd run backend:smoke:hardening`
  - `npm.cmd run backend:smoke:monitoring`
- persistent disk assumptions:
  - Phase 7A/7B document Render persistent disk assumptions and the need for durable production storage.
  - production still requires operator verification that the DB path is on persistent storage before deployment.
- `.gitignore` coverage:
  - local backend data, SQLite files, WAL/SHM files, logs, env files, native build output, and generated artifacts were already ignored.
  - explicit backup directories and generic backup extensions were not previously called out.
- backup gaps:
  - no explicit SQLite backup helper existed.
  - no backup smoke coverage existed.
  - backup verification steps were documented at a high level only.
- rollback gaps:
  - migration rollback is forward-only and restore-dependent.
  - no production deployment checklist existed that combined backup, migration, smoke, monitoring, and rollback criteria.

## Implementation

- Added `scripts/backup-sqlite-db.js`.
- Added `npm.cmd run backend:backup:sqlite`.
- Added `scripts/smoke-backup.js`.
- Added `npm.cmd run backend:smoke:backup`.
- Hardened `.gitignore` for:
  - `backend/backups/`
  - `backups/`
  - `*.backup`
  - `*.bak`
- Added this Phase 7E report with backup, rollback, and deployment runbooks.
- Updated README roadmap for Phase 7E and Phase 7F.

The restore flow remains documentation-only in Phase 7E. No destructive restore helper was added.

## Backup policy

- what is backed up:
  - the configured SQLite backend database file through the `better-sqlite3` SQLite backup API.
  - the backup API creates a consistent backup database and safely accounts for active SQLite WAL state without printing table rows.
- where backups must be stored:
  - outside Git-tracked source control.
  - preferably on provider-managed private backup storage or a secured operations location.
  - the local helper defaults to `backend/backups/`, which is ignored by Git.
- what must never be committed:
  - SQLite databases
  - WAL/SHM files
  - backup files
  - logs
  - patch artifacts
  - env files
  - secrets
- WAL/SHM handling:
  - production SQLite runs in WAL mode.
  - the helper uses SQLite's backup API instead of raw DB row reads or ad hoc row export.
  - if a manual file-system backup is ever used outside this helper, backend writes must be stopped or a SQLite-safe backup/snapshot procedure must be used so WAL state is not lost.
- backup verification:
  - confirm the backup command exits successfully.
  - confirm the backup file exists.
  - confirm the backup file size is greater than zero.
  - record timestamp, environment, commit/tag, and storage location in a private operations note.
- privacy rules:
  - backup output must not print DB rows.
  - backup output must not print payload values.
  - backup output must not print secrets.
  - backup files must not be attached to issues, commits, logs, or chat.

## Rollback policy

- backend tag rollback:
  - prefer app/backend rollback to the previous known-good tag first when data integrity is not implicated.
  - preserve production environment variables unless incident response specifically requires rotation.
  - run build, migrate/status, health/status, and smoke checks after rollback.
- migration rollback limitation:
  - current migrations are forward-only.
  - destructive down migrations are not implemented.
  - DB restore from a pre-deploy backup is the rollback path for migration/data corruption incidents.
- DB restore procedure:
  - stop backend writes.
  - confirm the target environment and incident reason.
  - verify the selected backup file and timestamp.
  - copy the current DB aside as a pre-restore safety backup.
  - restore the backup using a SQLite-safe process that preserves WAL/SHM requirements.
  - run `npm.cmd run backend:migrate`.
  - run `npm.cmd run backend:migrate:status`.
  - verify zero pending migrations unless the rollback plan explicitly expects otherwise.
  - run `/health` and `/status`.
  - run staging/test smokes before returning production traffic.
- safety backup before restore:
  - always capture the current DB file before replacing it.
  - do not overwrite the only production copy.
- staging verification:
  - rehearse restore in staging/test before production restore.
  - never test destructive restore against the live production DB.

## Production deployment checklist

Pre-deploy:

- confirm clean Git working tree.
- confirm release commit and tag are approved.
- confirm backend build passes.
- confirm root TypeScript passes.
- confirm combined typecheck passes.
- confirm migration smoke passes.
- confirm sync smoke passes.
- confirm hardening smoke passes.
- confirm monitoring smoke passes.
- confirm backup smoke passes.
- confirm production env vars are configured in the hosting provider only.
- confirm `DATABASE_URL` or `DATABASE_PATH` points to durable persistent disk storage.
- confirm OpenAI staging/prod separation.
- confirm rate limits are production-appropriate.
- confirm `LOG_LEVEL=info` or stricter.
- confirm secrets are not present in repo or logs.

Backup before deploy:

- run `npm.cmd run backend:backup:sqlite` against the production DB host only after confirming the configured DB path.
- verify the backup file exists.
- verify backup file size is greater than zero.
- record backup timestamp.
- store backup outside repo.
- do not expose backup publicly.
- do not paste backup metadata that contains private paths or operational secrets into public systems.

Migration:

- run `npm.cmd run backend:migrate`.
- run `npm.cmd run backend:migrate:status`.
- verify zero pending migrations.
- verify `/health`.
- verify `/status`.
- confirm status output does not expose secrets, DB paths, user IDs, payloads, or stack traces.

Post-deployment:

- run health/status checks.
- run sync smoke against staging/test paths where credentials and data are safe.
- inspect privacy-safe logs for request IDs and status codes only.
- confirm monitoring status shows aggregate-only metadata.
- confirm AI fallback behavior if OpenAI is unavailable.
- confirm sync endpoints still require auth.
- confirm rate limit `429` remains safe and generic.

Rollback trigger conditions:

- backend fails to start.
- migrations fail.
- `/health` or `/status` fails.
- sync endpoints regress.
- logs expose sensitive data.
- monitoring exposes unsafe metadata.
- DB writes fail or persistent disk is unavailable.

Rollback:

- roll backend to the previous approved commit/tag.
- keep env vars unchanged unless incident response requires rotation.
- restore DB from backup only if migration/data issue requires it.
- verify health/status.
- run migration status.
- run smoke checks again.
- document result privately without DB rows, secrets, or payloads.

## Privacy and safety

- no DB row contents printed
- no sync/export/delete payload logging
- no backup files committed
- no backup upload implemented
- no automatic backup on server startup
- no destructive restore script added
- no secrets exposed
- no mobile behavior changed
- Phase 7B migration behavior preserved
- Phase 7C rate limiting/request hardening preserved
- Phase 7D privacy-safe logging/monitoring preserved

## Validation

- `npm.cmd run backend:build`: passed
- `npx.cmd tsc --noEmit`: passed
- `npm.cmd run typecheck`: passed
- `npm.cmd run backend:migrate`: passed; all migrations applied and zero pending
- `npm.cmd run backend:migrate:status`: passed; all migrations applied and zero pending
- `npm.cmd run backend:smoke:migrations`: passed
- `npm.cmd run backend:smoke:sync`: passed
- `npm.cmd run backend:smoke:hardening`: passed
- `npm.cmd run backend:smoke:monitoring`: passed
- `npm.cmd run backend:smoke:backup`: passed
- `git diff --check`: passed with CRLF normalization warnings only
- Android RC build: skipped because Phase 7E changed backend scripts, backup/deployment documentation, `.gitignore`, and README only; no mobile/app runtime code changed

## Smoke results

- backup helper: passed against a temporary SQLite database only
- backup file verification: passed; backup file existed and was non-empty
- existing regression smokes: migration, sync, hardening, and monitoring smokes passed

## Result

Pending review. Implementation and automated validation are complete; commit/tag/push have not been performed.

## Files changed

- `.gitignore`
- `README.md`
- `docs/phase-7e-backup-rollback-production-deployment-checklist-report.md`
- `package.json`
- `scripts/backup-sqlite-db.js`
- `scripts/smoke-backup.js`

## Next phase

Phase 7F - Production Release Candidate Validation

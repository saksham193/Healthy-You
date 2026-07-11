# Phase 7A - Production Backend and Monitoring Readiness Planning

## Summary

Phase 7A documents production backend and monitoring readiness for Healthy You. This phase is planning-only and is included in the staged checkpoint as documentation/readiness work. It does not change runtime backend behavior, mobile behavior, deployment config, permissions, packages, sync behavior, or logging behavior.

The current backend has a useful staging foundation: Express routes, auth, validation, SQLite persistence, Render staging blueprint, health/status routes, global request logging, basic rate limiting, and OpenAI configuration gates. Production readiness still requires database/migration hardening, environment separation, privacy-safe observability, alerting, backup/rollback procedures, and production deployment runbooks.

## Starting checkpoint

- Last committed commit: ebc47a3d8e366791a786ceec2981d1ab0173acda
- Last committed tag: v0.37.0-alpha
- Phase 6C-6F implemented locally; Android runtime QA later passed before commit/tag closure
- Phase 7A is planning-only on top of staged WIP
- No Phase 7 runtime code was implemented

## Scope

- production backend readiness planning
- monitoring and observability planning
- no runtime behavior changes
- no deployment changes

## Current backend state

- Health/status routes:
  - `GET /health` returns status and timestamp.
  - `GET /status` returns service name, environment, and whether OpenAI is configured.
- AI routes:
  - `POST /ai/message` requires auth and validates JSON requests.
  - `POST /ai/nutrition/analyze-image` requires auth and uses a raw parser with image MIME/size limits.
  - `POST /ai/assistant/analyze-attachment` requires auth and uses a raw parser with attachment MIME/size limits.
- Sync routes:
  - `POST /sync/push`, `GET /sync/pull`, `GET /sync/export`, and `DELETE /sync/data` require auth.
  - Phase 6E export/delete endpoints are user-scoped and backend-owned sync-record-only.
- Auth requirements:
  - Bearer access tokens are required by protected routes.
  - Auth register/login/refresh routes have a stricter auth rate limiter.
- SQLite persistence:
  - `better-sqlite3` is used with WAL mode and foreign keys enabled.
  - Tables are created at startup with `CREATE TABLE IF NOT EXISTS`.
  - Some memory columns are added with startup `ALTER TABLE` checks.
  - Sync records live in `sync_entities`.
- Staging backend assumptions:
  - `render.yaml` defines a staging web service named `healthy-you-staging-backend`.
  - Render staging uses a persistent disk at `/var/data`.
  - `DATABASE_URL=file:/var/data/healthy-you-staging.sqlite`.
  - `OPENAI_API_KEY` and `CORS_ORIGIN` are intended to be supplied via Render secret/env handling.
  - `autoDeployTrigger` is off.

## Production readiness gaps

- Production database:
  - SQLite is acceptable for current staging/beta but needs an explicit production decision: hardened SQLite on persistent disk versus managed Postgres.
  - The production database location must use durable storage, backup support, and restore testing.
- Migrations:
  - Startup table creation is not enough for production schema lifecycle.
  - Add versioned migrations, migration ordering, rollback notes, and pre-deploy migration validation.
- Backups:
  - No automated database backup job or restore drill is documented for production.
  - WAL files must be included if SQLite remains in use.
- Environment separation:
  - Staging and production need separate backend services, databases, secrets, OpenAI keys, CORS origins, and mobile API base URLs.
  - Production must not reuse staging database files or keys.
- OpenAI staging/prod separation:
  - Use separate `OPENAI_API_KEY` values for staging and production.
  - Track model changes with rollout notes and fallback behavior.
  - Live AI validation must run in staging before production.
- Secrets management:
  - Production env validation requires non-placeholder JWT/OpenAI config and restricted CORS.
  - Real secrets must live only in deployment secret stores.
- Rate limiting:
  - Current global API limiter and auth limiter exist.
  - Production should add route-class limits for AI, sync, export/delete, and auth-sensitive workflows.
- Request size limits:
  - Global JSON limit is 1 MB.
  - AI image/attachment routes have raw parser limits.
  - Production should document final size limits and alert on rejected large requests.
- Privacy-safe logging:
  - Current request logger logs method, path, status, and duration only.
  - Unhandled error logging can include message/stack; production policy should scrub payload-like errors and route user-visible errors through controlled messages.
- Monitoring and alerts:
  - No external uptime checks, metrics sink, alert routing, or dashboard is wired yet.
- Rollback procedure:
  - No production rollback runbook exists for backend version, database migration, or mobile API compatibility.

## Privacy-safe observability plan

- What can be logged:
  - request method
  - route path template or coarse path
  - status code
  - duration
  - request id / trace id
  - deployment version
  - environment
  - aggregate counts for AI intent/safety class where payload is excluded
  - aggregate sync/export/delete success/failure counts
- What must never be logged:
  - nutrition, hydration, fitness, habit, medication, schedule, notes, profile details, or sync payload values
  - AI prompts, AI responses, image data, file contents, audio data, attachment contents, and raw medical document content
  - JWTs, refresh tokens, OpenAI keys, database credentials, secrets, passwords, or auth headers
  - cloud export/delete payloads or local queue payloads
- Sync/export/delete payload redaction:
  - record only route, user-scoped outcome category, count, status, duration, and controlled error code
  - do not record entity ids unless a short-lived internal trace policy is approved and redacted
- AI/image/file/audio redaction:
  - record provider availability, latency, status, safety category, and controlled error type
  - do not store raw prompt, response, image bytes, document text, attachment name when sensitive, or audio content
- Error reporting policy:
  - production error reporting should group by controlled error code and stack fingerprint
  - redact request bodies, headers, auth details, and payload-derived error strings

## Monitoring plan

- Uptime checks:
  - external check for `/health`
  - alert when health check fails from multiple regions or repeats over a short window
- Health/status checks:
  - monitor `/health` for liveness
  - monitor `/status` in staging for environment and OpenAI configured state, without exposing secrets
- API latency:
  - p50/p95/p99 latency for auth, AI, sync, profile, memory, and health summary routes
- 4xx/5xx rates:
  - alert on elevated 5xx rates
  - alert on spikes in 401/403/429 for abuse or client auth regressions
- Sync endpoint errors:
  - monitor `/sync/push`, `/sync/pull`, `/sync/export`, and `/sync/data` status codes, latency, and controlled error codes
- AI endpoint availability:
  - monitor OpenAI unavailable errors, timeout rates, and fallback rates
- Storage/database errors:
  - alert on SQLite/database open errors, write failures, disk pressure, WAL growth, and backup failures
- Deployment failure alerts:
  - notify on failed build, failed start, failed health check, or rollback activation

## Rate limiting plan

- AI routes:
  - stricter authenticated per-user and per-IP limits
  - separate limits for text AI, nutrition image analysis, and attachment analysis
  - lower burst limits for binary/raw upload routes
- Sync routes:
  - moderate authenticated limits for `/sync/push` and `/sync/pull`
  - lower limits for `/sync/export` and `/sync/data`
  - consider per-user operation counters to prevent repeated delete/export abuse
- Auth-sensitive routes:
  - keep strict register/login/refresh limits
  - add alerting for repeated auth failures
- Export/delete routes:
  - require auth, confirmation on client, and strict backend rate limits
  - audit only metadata outcomes, never payload contents
- Public health/status routes:
  - health can be public but should have reasonable global abuse protection
  - status should remain non-secret and avoid operational detail that helps attackers

## Backup and rollback plan

- Database backup approach:
  - if SQLite remains in production, use provider disk snapshots plus scheduled SQLite-safe backups that include WAL state
  - test restore into staging before production launch
  - define retention windows and access controls
- Migration rollback:
  - introduce migration versions
  - require forward migration test and rollback notes for each migration
  - block destructive migrations without backup/restore proof
- App/backend version rollback:
  - keep previous backend artifact and last known-good mobile API contract
  - preserve current production env vars during rollback unless a secret rotation is part of incident response
- Staging verification before production:
  - run backend build, typecheck, sync smoke, AI fallback/live checks as configured, and mobile API smoke against staging
  - verify production-like CORS, auth, database path, and OpenAI key separation in staging

## Security and secrets checklist

- `OPENAI_API_KEY`
  - store only in Render/deployment secret store
  - separate staging and production keys
  - rotate before production if any key was used in a non-production environment
- JWT/auth secrets
  - use separate access and refresh secrets in production
  - do not use checked-in placeholder or staging secrets
  - define rotation procedure and user-session impact
- Database credentials
  - if using managed database later, store credentials only in secret store
  - if using SQLite, secure persistent disk access and backup access
- Staging/prod separation
  - separate services, databases, env vars, keys, OpenAI accounts/keys, CORS origins, API base URLs, and monitoring alert labels
- No secrets in repo
  - keep `.env.*` real secrets out of source control
  - keep placeholders in examples only
- Render/environment variable handling
  - use `sync: false` or generated values for secrets
  - avoid wildcard CORS in production
  - confirm production env validation fails closed when required secrets are missing

## Phase 7 implementation roadmap

- Phase 7B: Production database and migration hardening
- Phase 7C: Rate limiting and request hardening
- Phase 7D: Privacy-safe logging and monitoring
- Phase 7E: Backup/rollback and production deployment checklist
- Phase 7F: Production release candidate validation

## Validation

- documentation diff check: passed with CRLF normalization warning only
- typecheck only if code changed: not required; Phase 7A changed docs/README only

## Result

Planning complete. Phase 7A remains documentation/readiness work only and is included in the staged checkpoint after Phase 6 Android QA closure.

## Files changed

- `README.md`
- `docs/phase-7a-production-backend-monitoring-readiness-report.md`

## Next phase

Phase 7B - Production Database and Migration Hardening

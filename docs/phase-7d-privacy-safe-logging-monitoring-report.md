# Phase 7D - Privacy-Safe Logging and Monitoring

## Summary

Phase 7D adds a vendor-neutral observability foundation for the backend with structured allowlisted logs, request ID correlation, safe aggregate monitoring metadata, and local smoke coverage for privacy-safe status/error responses.

This phase does not change mobile runtime behavior, mobile permissions, sync automation, database migrations, diagnosis logic, or file/image/audio upload behavior.

## Starting checkpoint

- commit: 13f504c106b0251b6efd067c2bb6b581538008bc
- tag: v0.40.0-alpha

## Scope

- privacy-safe structured logging
- request ID / correlation ID support
- safe monitoring readiness
- safe status metadata
- no mobile runtime behavior changes

## Existing observability audit

- request logging:
  - existing request logging recorded method, path without query string, status code, and duration.
  - request bodies, response bodies, authorization headers, cookies, tokens, and payload values were not logged.
  - request logs did not include a correlation/request ID.
- error handling:
  - Phase 7C safe responses existed for `400`, `413`, `415`, `429`, `404`, and generic `500`.
  - production responses did not expose stack traces.
  - safe error responses did not include request IDs.
- status/health routes:
  - `/health` returned a simple status/timestamp response.
  - `/status` returned service name, environment, and whether OpenAI was configured.
  - `/status` did not expose secrets, but it also did not expose database or migration readiness.
- rate limiting integration:
  - limiter groups existed for public health, default API, auth, AI, sync, and sync export/delete routes.
  - rate-limit logs were metadata-only but did not include request IDs or aggregate monitoring counters.
- migration/sync smoke coverage:
  - migration, sync, and request-hardening smoke scripts already existed.
  - no dedicated monitoring smoke script existed.
- sensitive data exposure risks:
  - logger metadata was not allowlisted before Phase 7D, so future callers could accidentally include unsafe fields.
  - status metadata did not yet include documented safe operational boundaries for monitoring.

## Implementation

- Added `backend/src/middleware/requestId.ts`.
- Added safe incoming `X-Request-Id` handling with short allowlisted values only.
- Added generated request IDs when no safe incoming ID is provided.
- Added the request ID response header to all backend responses.
- Added request IDs to safe error and rate-limit responses.
- Reworked `backend/src/utils/logger.ts` into a structured logger with an allowlist of safe metadata keys.
- Added safe path normalization for logged routes that could otherwise contain record IDs.
- Added log-level configuration through `LOG_LEVEL`.
- Added `backend/src/monitoring/metrics.ts` with process-local aggregate counters/timers.
- Updated request logging to record aggregate metrics and include request IDs.
- Updated rate-limit handling to increment aggregate rate-limit counters.
- Updated malformed/unsupported request handling to increment aggregate malformed counters.
- Expanded `/status` with safe readiness metadata:
  - service status
  - environment
  - OpenAI configured boolean
  - database readiness boolean
  - migration readiness boolean
  - request ID
  - aggregate monitoring snapshot
  - migration applied/pending counts only
- Kept `/health` simple while adding safe request ID correlation.
- Added environment settings:
  - `LOG_LEVEL`
  - `REQUEST_ID_HEADER`
  - `MONITORING_ENABLED`
  - `MONITORING_SAFE_STATUS_ENABLED`
- Added `scripts/smoke-monitoring.js`.
- Added `npm.cmd run backend:smoke:monitoring`.

## Privacy-safe logging policy

Allowed log fields:

- timestamp
- level
- event
- requestId
- method
- path without query string
- route paths with record-like path values normalized
- statusCode
- durationMs
- limiterGroup
- environment
- serviceName
- generic errorCode
- migration id/name/status
- smoke check label

Forbidden log fields:

- authorization headers
- cookies
- tokens
- API keys
- secrets
- request bodies
- response bodies
- sync payloads
- export/delete payloads
- nutrition, fitness, hydration, medication, habit, schedule, routine, profile, or medical-history details
- AI prompts or responses
- file, image, audio, or attachment contents
- sensitive attachment names
- full URLs with query strings
- path values that expose record IDs
- raw stack traces in production responses

The structured logger drops metadata keys outside the allowlist and only writes safe scalar values.

## Monitoring policy

- `/health` remains simple and stable for uptime checks.
- `/status` exposes vendor-neutral operational readiness only.
- Monitoring metadata is aggregate-only and process-local.
- Current aggregate metadata includes:
  - uptime seconds
  - total request count
  - status code group counts
  - average request duration
  - rate-limited request count
  - malformed/unsupported request count
  - database readiness boolean
  - migration readiness boolean
  - migration applied/pending counts
- `/status` does not expose:
  - IP addresses
  - user IDs
  - tokens
  - secrets
  - raw database paths
  - sync payloads
  - health records
  - prompts
  - file names or contents

The current metrics are in-memory and reset on process restart. A later production monitoring phase should connect this safe aggregate model to durable/vendor monitoring after deployment requirements are finalized.

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
- `git diff --check`: passed with CRLF normalization warnings only
- Android RC build: skipped because Phase 7D changed backend observability, backend config, backend smoke scripts, and documentation only; no mobile/app runtime code changed

## Smoke results

- health/status: passed
- request ID: passed; safe incoming IDs are preserved and generated IDs are returned otherwise
- safe `400`/`415`/`429` behavior: passed with matching request IDs
- no secret/payload exposure: passed
- regression checks: migration smoke, sync smoke, and hardening smoke passed

## Result

Pending review. Implementation and automated validation are complete; commit/tag/push have not been performed.

## Files changed

- `README.md`
- `backend/.env.example`
- `backend/src/app.ts`
- `backend/src/config/EnvValidator.ts`
- `backend/src/controllers/StatusController.ts`
- `backend/src/middleware/errorHandler.ts`
- `backend/src/middleware/requestId.ts`
- `backend/src/middleware/requestLogger.ts`
- `backend/src/middleware/security.ts`
- `backend/src/monitoring/metrics.ts`
- `backend/src/server.ts`
- `backend/src/types/express.ts`
- `backend/src/utils/logger.ts`
- `docs/phase-7d-privacy-safe-logging-monitoring-report.md`
- `package.json`
- `scripts/smoke-monitoring.js`

## Next phase

Phase 7E - Backup, Rollback, and Production Deployment Checklist

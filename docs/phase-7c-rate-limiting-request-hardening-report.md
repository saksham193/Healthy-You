# Phase 7C - Rate Limiting and Request Hardening

## Summary

Phase 7C hardens backend request handling with route-aware rate limiting, environment-configurable limits, JSON request content-type checks, bounded request body parsing, safe 429/400/415 responses, and local smoke coverage.

This phase does not change mobile runtime behavior, mobile permissions, sync automation, database migrations, diagnosis logic, or file/image/audio upload behavior.

## Starting checkpoint

- commit: 8fad7fcacf27502b854d336c37bcebcb5bb4b7aa
- tag: v0.39.0-alpha

## Scope

- backend rate limiting
- request size hardening
- content-type/malformed body safety
- privacy-safe error/log behavior
- no mobile runtime behavior changes

## Existing request handling audit

- app initialization:
  - `backend/src/app.ts` initializes database migrations, Helmet, CORS, JSON parsing, request logging, route mounting, 404 handling, and error handling.
- JSON body limits:
  - general JSON parsing previously used a hard-coded `1mb` limit.
  - AI image and attachment routes already used bounded raw parsers.
- route mounting:
  - health/status routes are public.
  - auth routes are mounted under `/auth`.
  - AI routes are mounted under `/ai`.
  - sync routes are mounted under `/sync`.
- error handling:
  - `HttpError` responses return controlled status/code/message JSON.
  - payload-too-large had a safe 413 response.
  - malformed JSON was not explicitly handled before Phase 7C.
- request logging:
  - request logger records method, path, status code, and duration only.
  - request bodies, headers, tokens, and payload values are not logged.
- AI routes:
  - `/ai/message` accepts JSON.
  - `/ai/nutrition/analyze-image` accepts bounded image raw bodies.
  - `/ai/assistant/analyze-attachment` accepts bounded attachment raw bodies.
- sync routes:
  - `/sync/push`, `/sync/pull`, `/sync/export`, and `DELETE /sync/data` require auth.
  - export returns metadata only.
- health/status routes:
  - `/health` and `/status` remain public and non-secret.

## Implementation

- Added environment-backed rate/request settings in `backend/src/config/EnvValidator.ts`.
- Reworked `backend/src/middleware/security.ts` into named limiter groups:
  - `public_health`
  - `default_api`
  - `ai_sensitive`
  - `sync`
  - `sync_privacy_sensitive`
  - `auth_sensitive`
- Added safe 429 responses:
  - `{ "error": "Too many requests. Please wait and try again.", "code": "RATE_LIMITED" }`
- Added `backend/src/middleware/requestHardening.ts`.
- Kept request logs metadata-only and normalized logged paths without query strings.
- Added JSON content-type validation for JSON methods/routes.
- Updated app middleware order so request logging remains metadata-only and health/status are not squeezed by the default API limiter.
- Updated AI and sync routes with route-aware limiter groups.
- Updated general JSON body limit to use `REQUEST_BODY_LIMIT_JSON`.
- Updated nutrition image parser limit to use `REQUEST_BODY_LIMIT_AI_IMAGE`.
- Added safe malformed JSON response handling.
- Added `scripts/smoke-request-hardening.js`.
- Added `npm.cmd run backend:smoke:hardening`.

## Rate limit policy

- health/status:
  - group: `public_health`
  - generous public limit for uptime checks and status probes
  - mounted before the default API limiter
- AI routes:
  - group: `ai_sensitive`
  - default: `20` requests per `60,000` ms
  - applies to AI message, nutrition image analysis, and assistant attachment analysis
- sync push/pull:
  - group: `sync`
  - default: `60` requests per `60,000` ms
- export/delete:
  - group: `sync_privacy_sensitive`
  - default: `10` requests per `60,000` ms
- auth routes:
  - group: `auth_sensitive`
  - default: `20` requests per `900,000` ms
- default API:
  - group: `default_api`
  - default: `120` requests per `60,000` ms
  - fallback protection for non-health routes

The current limiter uses in-memory process-local counters from `express-rate-limit`. Production multi-instance deployments should add shared rate-limit storage in a later deployment hardening phase.

## Privacy and safety

- no sensitive payload logging
- no token/secret logging
- safe 429/400/415/500 responses
- no AI prompt/response logging
- no health, nutrition, fitness, medication, habit, hydration, profile, file, image, audio, or attachment content logging
- no automatic upload
- no background sync
- local/offline mobile behavior unchanged
- Phase 7B migration behavior preserved

## Validation

- `npm.cmd run backend:build`: passed
- `npx.cmd tsc --noEmit`: passed
- `npm.cmd run typecheck`: passed
- `npm.cmd run backend:migrate`: passed; all migrations applied and zero pending
- `npm.cmd run backend:migrate:status`: passed; all migrations applied and zero pending
- `npm.cmd run backend:smoke:migrations`: passed
- `npm.cmd run backend:smoke:sync`: passed
- `npm.cmd run backend:smoke:hardening`: passed
- `git diff --check`: passed with CRLF normalization warnings only
- Android RC build: skipped because Phase 7C changed backend request handling, backend config, backend smoke scripts, and documentation only; no mobile/app runtime code changed

## Smoke results

- health/status: passed
- malformed JSON: passed; safe `400` with `malformed_json`
- unsupported content type: passed; safe `415` with `unsupported_media_type`
- rate limit response: passed; safe `429` with `RATE_LIMITED`
- regression checks: migration smoke and sync smoke passed

## Result

Pending review. Implementation and automated validation are complete; commit/tag/push have not been performed.

## Files changed

- `README.md`
- `backend/.env.example`
- `backend/src/app.ts`
- `backend/src/config/EnvValidator.ts`
- `backend/src/middleware/errorHandler.ts`
- `backend/src/middleware/requestLogger.ts`
- `backend/src/middleware/requestHardening.ts`
- `backend/src/middleware/security.ts`
- `backend/src/routes/aiRoutes.ts`
- `backend/src/routes/statusRoutes.ts`
- `backend/src/routes/syncRoutes.ts`
- `docs/phase-7c-rate-limiting-request-hardening-report.md`
- `package.json`
- `scripts/smoke-request-hardening.js`

## Next phase

Phase 7D - Privacy-Safe Logging and Monitoring

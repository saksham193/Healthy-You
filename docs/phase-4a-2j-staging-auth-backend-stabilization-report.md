# Phase 4A-2J Staging Auth Backend Stabilization Report

Date: 2026-07-02

## 1. Executive summary

Result: Code fix implemented locally; live staging validation requires deploy.

The live HTTPS staging backend still responds correctly on `/health` and `/status`, but auth endpoints currently return generic `HTTP 500` for requests that should be classified as client/auth errors. The clearest reproduction is invalid `/auth/logout`, which does not touch the database and still returns `500`, proving at least one blocker is request/error classification rather than SQLite writes.

A minimal production-safe backend hardening fix was implemented:

- `HttpError` now sets `name = "HttpError"`.
- `isHttpError` now recognizes HTTP errors structurally instead of relying only on brittle `instanceof`.
- Request validation now extracts Zod issue messages defensively and falls back to `Invalid request body.` without throwing.

No Android network security, local HTTP, auth architecture, or AI architecture changes were made.

## 2. Root cause of /auth/register HTTP 500

Confirmed root cause class: auth errors are being converted to generic internal errors in the live staging deployment.

Evidence:

- `POST /auth/login` with malformed validation input returned `HTTP 500`.
- `POST /auth/logout` with malformed validation input returned `HTTP 500`.
- `/auth/logout` does not use the auth-specific rate limiter and does not query/write SQLite before validation, so that 500 cannot be explained by duplicate email, password hashing, token issuance, or DB write failure.

Likely code-level cause addressed locally:

- Runtime HTTP error classification depended only on `error instanceof HttpError`.
- If the deployed runtime loads duplicated/mismatched modules or receives an error object that is structurally an HTTP error but not the exact class instance, the error handler classifies it as unhandled and returns `500`.
- Validation message extraction was also made defensive so a Zod error shape mismatch cannot create a secondary `TypeError`.

Fresh `/auth/register` still needs to be revalidated after deployment because a valid register request can also exercise DB write and JWT issuance paths.

## 3. Root cause of saved account HTTP 401

Most likely cause: staging data was reset or the saved test user no longer exists in the SQLite database.

Supporting context:

- `render.yaml` configures persistent disk storage at `/var/data`, but the actual live Render service storage could not be inspected from this environment.
- Earlier Phase 4A-2I registration succeeded once, then the app later resumed to `Your session expired. Please log in again.`
- The saved user from `phase4a_2i_test_account.txt` no longer provided a usable authenticated session.

This remains partially unconfirmed until Render disk/database state is inspected. If the Render disk was not actually attached to the live service, or if the service was redeployed before disk persistence was active, previous users may have been lost.

## 4. Render/backend logs reviewed

Render logs could not be directly reviewed from this workspace.

Findings:

- `render` CLI is not installed on PATH.
- No Render API token or MCP connector was available in the environment.
- Client-side Render request IDs were captured from failing responses and can be used in the Render dashboard:
  - invalid `/auth/login`: `rndr-id: 2bff8b38-c613-4897`
  - malformed `/auth/login`: `rndr-id: 0665af6d-51ba-4ecc`
  - malformed `/auth/logout`: `rndr-id: 19eeccba-4a87-40d4`

Required follow-up in Render dashboard:

- Inspect logs for those request IDs.
- Confirm whether errors are `internal_error` from `HttpError` misclassification, DB table/path errors, or both.

## 5. Database/storage findings

Configured in `render.yaml`:

- Disk name: `healthy-you-staging-data`
- Disk mount path: `/var/data`
- SQLite URL: `file:/var/data/healthy-you-staging.sqlite`
- Backend path normalization strips `file:` to `/var/data/healthy-you-staging.sqlite`.
- Startup calls `initializeDatabase()` and runs `CREATE TABLE IF NOT EXISTS` for `users`, `refresh_tokens`, `memories`, `health_profiles`, `health_summaries`, and `insights`.

Code inspection result:

- Relative Render root path is not expected to affect the configured staging DB because `/var/data/healthy-you-staging.sqlite` is absolute after prefix trimming.
- If the live service is actually using this blueprint and the disk is attached/writable, tables should be created on startup.
- If the live service was deployed without the disk or with different environment values, SQLite may be using an ephemeral/default path and previous users can disappear after rebuild/restart.

Direct DB file writability could not be verified without Render shell/log access.

## 6. Fix implemented

Minimal backend fix:

- Hardened `HttpError` identity and detection.
- Hardened request validation message extraction.

This preserves current auth architecture, response shapes, and sanitization:

- invalid credentials should remain sanitized as `Email or password is incorrect.`
- validation errors should return `400 invalid_request`
- duplicate email should return `409 email_in_use`
- unexpected DB/JWT failures should still return sanitized `500 internal_error` and log server-side details

## 7. Files changed

- `backend/src/utils/httpError.ts`
- `backend/src/middleware/validateRequest.ts`
- `docs/phase-4a-2j-staging-auth-backend-stabilization-report.md`

Pre-existing unrelated workspace changes were not reverted.

## 8. Validation commands run

Local diagnostics:

- Backend TypeScript diagnostics via TypeScript API: passed, `0` diagnostics.
- App TypeScript diagnostics via TypeScript API: passed, `0` diagnostics.

Live staging probes:

- `GET https://healthy-you-staging-backend.onrender.com/health`
- `GET https://healthy-you-staging-backend.onrender.com/status`
- `POST https://healthy-you-staging-backend.onrender.com/auth/register` with a fresh unique test email, status-only to avoid token output
- `POST https://healthy-you-staging-backend.onrender.com/auth/login` with invalid credentials
- `POST https://healthy-you-staging-backend.onrender.com/auth/login` with malformed validation input
- `POST https://healthy-you-staging-backend.onrender.com/auth/logout` with malformed validation input

Shell `npm`/`node` validation note:

- This shell does not have `node.exe` on PATH.
- `npm.ps1` is blocked by local PowerShell execution policy.
- `npm.cmd` cannot run because `node` is not found.
- The Node REPL runtime can run TypeScript diagnostics, but its Node ABI does not match the checked-in `better-sqlite3` native binary, so local backend startup was not valid from that runtime.

## 9. /health result

Result: Passed.

`GET /health` returned `HTTP 200`.

Observed body:

```json
{"data":{"status":"ok","timestamp":"2026-07-02T10:09:24.662Z"}}
```

## 10. /status result

Result: Passed.

`GET /status` returned `HTTP 200`.

Observed body:

```json
{"data":{"service":"healthy-you-backend","environment":"staging","openAIConfigured":false}}
```

`openAIConfigured=false` is acceptable for this phase; live OpenAI validation remains skipped.

## 11. /auth/register result

Current live staging result before deploying the fix:

- `POST /auth/register` with fresh unique email returned `HTTP 500`.
- Token response bodies were intentionally not printed.

Post-fix live validation status:

- Not yet validated because the patched backend has not been deployed to Render from this workspace.

## 12. /auth/login result

Current live staging results before deploying the fix:

- invalid credentials returned `HTTP 500` with sanitized generic body:

```json
{"error":{"code":"internal_error","message":"An unexpected error occurred."}}
```

- malformed validation input returned `HTTP 500`.
- malformed `/auth/logout` also returned `HTTP 500`.

Expected after deploying the fix:

- malformed login/logout should return `400 invalid_request`.
- invalid credentials should return sanitized `401 invalid_credentials`.
- login for a fresh registered user should return `200`; response body must not be logged.

Post-fix live validation status:

- Not yet validated because the patched backend has not been deployed to Render from this workspace.

## 13. Security/logging observations

- Token-issuing endpoint probes used status-only output where success could expose tokens.
- Full response body was only captured for invalid/malformed requests that cannot issue tokens.
- No Android/network-security changes were made.
- No local HTTP path was introduced.
- No secrets were read or printed.
- Existing request logger records method, path, status code, and duration only; it does not log request bodies or auth headers.

## 14. Remaining limitations

- Render logs and disk state were not accessible from this workspace.
- Actual live staging DB path, DB file writability, table existence, and disk persistence must be confirmed in Render.
- The fixed backend must be deployed before live `/auth/register` and `/auth/login` can be retested.
- If Render is running without the configured persistent disk, previous test users may remain ephemeral even after this code fix.

## 15. Whether Phase 4A-2I can resume

Not yet.

Phase 4A-2I should resume only after the patched backend is deployed and these live checks pass:

- `/auth/register` succeeds for a fresh unique staging test user.
- `/auth/login` succeeds for that user.
- invalid credentials return sanitized `401`.
- malformed auth input returns `400`, not `500`.
- no tokens or secrets appear in logs.

## 16. Exact next step for Android authenticated runtime validation

1. Deploy the patched backend to Render.
2. In Render logs, verify no DB write/table/path error appears during `/auth/register`.
3. Run status-only fresh registration, then login without printing token bodies.
4. Save the new staging test account credentials in `phase4a_2i_test_account.txt`.
5. Resume Phase 4A-2I from logout/login/session persistence onward using the installed release APK and the same HTTPS staging URL.

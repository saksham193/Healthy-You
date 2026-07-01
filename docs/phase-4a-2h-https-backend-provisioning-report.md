# Phase 4A-2H HTTPS Backend Provisioning Report

Date: 2026-07-02

## 1. Executive summary

Phase 4A-2H prepared Healthy You for HTTPS staging backend deployment, but did not complete live deployment because no hosting credentials or generated HTTPS service URL were available in the workspace.

The backend is ready to deploy as a Node/Express web service. A Render staging blueprint was added because it can run the existing Node service over HTTPS and attach a persistent disk for the current SQLite database model. Android release network security was not weakened, cleartext HTTP was not enabled, and the Android RC APK was not rebuilt because no reachable HTTPS backend exists yet.

## 2. Backend structure discovered

Backend source lives under `backend/src`.

Key files:

- `backend/src/server.ts`: starts the Express app on `env.PORT`.
- `backend/src/app.ts`: initializes SQLite, applies Helmet, CORS, JSON parsing, rate limiting, request logging, and routes.
- `backend/src/config/Environment.ts`: loads `HEALTHY_YOU_BACKEND_ENV` or `backend/.env.<environment>`.
- `backend/src/config/EnvValidator.ts`: validates backend env vars.
- `backend/src/config/Config.ts`: derives access/refresh JWT secrets and SQLite database path.
- `backend/src/database/connection.ts`: opens SQLite with WAL mode and creates tables.
- `backend/src/routes/statusRoutes.ts`: exposes `/health` and `/status`.
- `backend/src/routes/authRoutes.ts`: exposes register, login, refresh, and logout.
- `backend/src/routes/profileRoutes.ts`: exposes authenticated profile sync.
- `backend/src/routes/memoryRoutes.ts`: exposes authenticated memory sync.
- `backend/src/routes/syncRoutes.ts`: exposes authenticated health summary sync.

Build/start commands:

- Build: `npm run backend:build`
- Start: `npm run backend:start`

## 3. Required environment variables

Required or recommended for HTTPS staging:

```bash
ENVIRONMENT=staging
NODE_ENV=production
PORT=<provider-managed-port>
DATABASE_URL=file:/var/data/healthy-you-staging.sqlite
CORS_ORIGIN=https://healthy-you-staging.example.com
JWT_ACCESS_SECRET=<secret-store-value-min-32-chars>
JWT_REFRESH_SECRET=<secret-store-value-min-32-chars>
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL=30d
OPENAI_MODEL=gpt-4.1-mini
OPENAI_API_KEY=<optional-real-openai-key>
```

The backend also supports a single `JWT_SECRET`, but Phase 4A-2H config uses separate access and refresh token secrets for staging.

## 4. Recommended hosting option

Recommended target: Render Web Service using `render.yaml`.

Reasoning:

- The backend is already a Node/Express service.
- Render supports Node web services with custom build/start commands.
- Render issues an HTTPS service URL after deploy.
- Render supports persistent disks, which fits the current SQLite database without redesigning the backend.

References checked:

- Render Node/Express deployment docs: https://render.com/docs/deploy-node-express-app
- Render persistent disk docs: https://render.com/docs/disks
- Render blueprint spec: https://render.com/docs/blueprint-spec
- Railway Express and volume docs were reviewed as an alternative: https://docs.railway.com/guides/express and https://docs.railway.com/volumes/reference

## 5. Deployment steps

Prepared deployment path:

1. Push the branch containing `render.yaml`.
2. Create a Render Blueprint from the repository.
3. Select the `healthy-you-staging-backend` service.
4. Confirm build command: `npm ci && npm run backend:build`.
5. Confirm start command: `npm run backend:start`.
6. Confirm health check path: `/health`.
7. Confirm persistent disk mount: `/var/data`.
8. Set `CORS_ORIGIN` to one restricted HTTPS origin.
9. Let Render generate `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`, or replace them with secret-store values.
10. Add `OPENAI_API_KEY` only if live AI validation is required and a real key is available.
11. Deploy the service.
12. Copy the generated HTTPS URL.
13. Verify `/health` and `/status`.
14. Only then update `.env.staging` and `eas.json` to the verified HTTPS URL.
15. Rebuild and install the Android RC APK.

## 6. Database persistence plan

The current backend uses SQLite through `better-sqlite3`.

Staging persistence plan:

- Attach a persistent disk at `/var/data`.
- Set `DATABASE_URL=file:/var/data/healthy-you-staging.sqlite`.
- Keep SQLite WAL mode enabled as currently implemented.
- Run a single service instance while using SQLite on disk.

This avoids a database architecture change. A managed Postgres migration would be a future architecture decision, not part of Phase 4A-2H.

## 7. CORS configuration

Staging should not use `CORS_ORIGIN=*`.

Use one restricted HTTPS origin, for example:

```bash
CORS_ORIGIN=https://healthy-you-staging.example.com
```

Native Android app requests are not browser CORS-gated, so a restricted browser CORS origin does not block Android RC validation.

## 8. Security configuration

Implemented/prepared:

- No Android release cleartext policy changes.
- No production or beta cleartext HTTP.
- No secrets committed.
- `OPENAI_API_KEY` remains backend-only.
- Separate generated access and refresh JWT secrets in staging blueprint.
- `NODE_ENV=production` with `ENVIRONMENT=staging` for hosted staging runtime.
- Persistent SQLite path moved out of ephemeral source tree.

Still required in host:

- Confirm generated JWT secrets are present.
- Enter a restricted `CORS_ORIGIN`.
- Enter `OPENAI_API_KEY` only when live AI validation is intended.

## 9. HTTPS URL status

No real HTTPS staging URL is available yet.

Current placeholder:

`https://staging-api.healthy-you.example.com`

Status: unresolved DNS; not usable for RC validation.

Expected post-deploy URL shape:

`https://healthy-you-staging-backend.onrender.com`

The exact URL must come from the completed hosting deployment.

## 10. /health result

Result: Failed for placeholder URL.

Probe:

`https://staging-api.healthy-you.example.com/health`

Observed result:

DNS resolution error: remote name could not be resolved.

## 11. /status result

Result: Failed for placeholder URL.

Probe:

`https://staging-api.healthy-you.example.com/status`

Observed result:

DNS resolution error: remote name could not be resolved.

## 12. Files changed

Changed in Phase 4A-2H:

- Added `render.yaml`
- Updated `docs/release/DEPLOYMENT.md`
- Added `docs/phase-4a-2h-https-backend-provisioning-report.md`

Not changed in Phase 4A-2H:

- `.env.staging`
- `eas.json`
- Android manifest/network security
- Android APK artifact

## 13. Remaining blockers

Remaining blockers:

- Render deployment has not been created from the blueprint.
- No generated HTTPS staging service URL is available.
- `CORS_ORIGIN` must be set in the hosting provider.
- Real JWT secrets must exist in the hosting provider.
- `OPENAI_API_KEY` is absent; live AI validation will remain blocked unless a real backend-only key is configured.
- `/health` and `/status` have not passed over a real HTTPS staging URL.
- Android RC authenticated runtime validation has not been rerun.

## 14. Exact next step for authenticated Android RC validation

Create the Render Blueprint deployment from `render.yaml`, set `CORS_ORIGIN` and any optional `OPENAI_API_KEY` in the Render dashboard, deploy `healthy-you-staging-backend`, then send the generated HTTPS URL through:

```bash
curl https://<generated-staging-url>/health
curl https://<generated-staging-url>/status
```

After both endpoints pass, update `.env.staging` and `eas.json` with that exact HTTPS URL, rebuild the real RC APK, install it, and rerun the authenticated Android RC runtime checklist.

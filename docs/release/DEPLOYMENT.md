# Deployment

## Backend Deployment

1. Set `HEALTHY_YOU_BACKEND_ENV` or provide environment variables directly in the host.
2. Provide real `JWT_SECRET` and `OPENAI_API_KEY` through the deployment secret store.
3. Use a persistent `DATABASE_URL`.
4. Restrict `CORS_ORIGIN` to the deployed mobile/web origin.
5. Run:

```bash
npm run backend:build
npm run backend:start
```

## Mobile Deployment

1. Set `EXPO_PUBLIC_ENVIRONMENT`.
2. Set `EXPO_PUBLIC_API_BASE_URL` to the deployed backend HTTPS URL.
3. Run typecheck and export validation.
4. Run EAS Android preview.
5. Smoke test the APK on a physical device.
6. Promote to production build only after backend and OpenAI live validation pass.

## OpenAI

OpenAI must remain backend-only. The mobile app must never include an OpenAI secret. The backend `/status` endpoint reports whether OpenAI is configured.

## HTTPS Staging Backend

Use a hosted HTTPS Node web service for Android RC authenticated validation. Do not enable Android release cleartext traffic for staging or beta builds.

Recommended target: Render Web Service with the checked-in `render.yaml` blueprint.

Why this target fits the current backend:

- The backend is a Node/Express service.
- The repo already has root-level build/start scripts.
- Render provides an HTTPS service URL after deployment.
- The current database is SQLite, so staging needs a persistent disk mounted at `/var/data`.

### Render Blueprint

The staging blueprint defines:

- Service name: `healthy-you-staging-backend`
- Build command: `npm ci && npm run backend:build`
- Start command: `npm run backend:start`
- Health check path: `/health`
- Persistent disk: `/var/data`
- SQLite database URL: `file:/var/data/healthy-you-staging.sqlite`
- `ENVIRONMENT=staging`
- `NODE_ENV=production`
- Generated `JWT_ACCESS_SECRET`
- Generated `JWT_REFRESH_SECRET`
- Manual secret-store values for `CORS_ORIGIN` and optional `OPENAI_API_KEY`

### Required Staging Environment

Set these in the hosting provider secret/env store:

```bash
ENVIRONMENT=staging
NODE_ENV=production
DATABASE_URL=file:/var/data/healthy-you-staging.sqlite
CORS_ORIGIN=https://healthy-you-staging.example.com
JWT_ACCESS_SECRET=<generated-or-secret-store-value-min-32-chars>
JWT_REFRESH_SECRET=<generated-or-secret-store-value-min-32-chars>
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL=30d
OPENAI_MODEL=gpt-4.1-mini
OPENAI_API_KEY=<optional-real-openai-key>
```

If a staging web origin does not exist and only the native Android app is validating, still set `CORS_ORIGIN` to a single known HTTPS origin rather than `*`. Native app requests are not browser CORS-gated.

Do not commit real JWT or OpenAI secrets.

### Deployment Steps

1. Push the branch containing `render.yaml`.
2. In Render, create a new Blueprint from the repository.
3. Select the `healthy-you-staging-backend` service.
4. Confirm the service uses the root repository directory.
5. Confirm the persistent disk is mounted at `/var/data`.
6. Enter a restricted HTTPS value for `CORS_ORIGIN`.
7. Enter `OPENAI_API_KEY` only if live AI validation is required and a real key is available.
8. Deploy the service.
9. Copy the generated HTTPS service URL, for example `https://healthy-you-staging-backend.onrender.com`.
10. Verify the endpoints:

```bash
curl https://<staging-backend-host>/health
curl https://<staging-backend-host>/status
```

Expected `/health` shape:

```json
{
  "data": {
    "status": "ok",
    "timestamp": "..."
  }
}
```

Expected `/status` shape:

```json
{
  "data": {
    "service": "healthy-you-backend",
    "environment": "staging",
    "openAIConfigured": true
  }
}
```

`openAIConfigured` may be `false` if `OPENAI_API_KEY` was intentionally omitted. In that case, authenticated runtime can still be tested, but live AI runtime remains blocked.

### Android RC Follow-Up

After `/health` and `/status` pass over HTTPS:

1. Set `.env.staging` `EXPO_PUBLIC_API_BASE_URL` to the verified HTTPS backend URL.
2. Set `eas.json` preview `EXPO_PUBLIC_API_BASE_URL` to the same verified HTTPS backend URL.
3. Rebuild the real Android RC APK.
4. Install the APK on the emulator/device.
5. Validate register, login, logout, session persistence, refresh behavior, authenticated offline launch, reconnect recovery, profile sync, memory sync, health summary sync, Health Connect, Medibot, and log hygiene.

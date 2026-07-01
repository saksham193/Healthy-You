# Phase 4A-2G HTTPS Staging Validation Report

Date: 2026-07-02

## 1. Executive summary

Phase 4A-2G did not reach authenticated Android RC runtime validation. The repository has documented backend deployment requirements and the mobile RC configuration has been moved back to an HTTPS staging URL, but no real reachable HTTPS staging backend is configured in this workspace.

The documented staging URL, `https://staging-api.healthy-you.example.com`, still does not resolve. Because `/health` and `/status` could not be verified over HTTPS, the RC APK was not rebuilt or installed for authenticated validation. Building an APK against an unresolved placeholder would not validate the runtime surface.

## 2. Backend hosting option used

No backend hosting option was available or used in this phase.

The current backend deployment path is a Node/Express service started with:

- `npm run backend:build`
- `npm run backend:start`

Deployment requirements identified in `docs/release/DEPLOYMENT.md` and `docs/release/ENV_SETUP.md`:

- Provide `HEALTHY_YOU_BACKEND_ENV` or direct backend environment variables.
- Provide real `JWT_SECRET` through the deployment secret store.
- Provide real `OPENAI_API_KEY` through the deployment secret store.
- Use a persistent `DATABASE_URL`.
- Restrict `CORS_ORIGIN` for deployed environments.
- Expose the backend through a valid HTTPS URL.
- Keep OpenAI secrets backend-only.

## 3. HTTPS URL tested

`https://staging-api.healthy-you.example.com`

This is the only HTTPS staging URL present in the repo. It is still a placeholder, not a live backend.

## 4. Backend health/status result

Result: Failed.

Fresh HTTPS probes from the validation machine:

- `https://staging-api.healthy-you.example.com/health`
  - Failed with DNS resolution error: remote name could not be resolved.
- `https://staging-api.healthy-you.example.com/status`
  - Failed with DNS resolution error: remote name could not be resolved.

No HTTPS backend health or status response was available to validate.

## 5. App config updated

Updated staging mobile configuration away from local cleartext HTTP:

- `.env.staging`
  - `EXPO_PUBLIC_API_BASE_URL=https://staging-api.healthy-you.example.com`
- `eas.json`
  - `preview.env.EXPO_PUBLIC_API_BASE_URL=https://staging-api.healthy-you.example.com`

This prevents the staging RC build path from continuing to embed `http://127.0.0.1:4000`. It does not complete staging setup because the configured HTTPS URL is not a real reachable backend.

## 6. RC APK artifact tested

Result: Not tested in Phase 4A-2G.

No new RC APK was rebuilt or installed after the HTTPS probe failed. Authenticated runtime validation requires a reachable HTTPS backend first.

## 7. Auth result

Result: Not validated.

Register, login, and logout could not be tested because no HTTPS staging backend was reachable.

## 8. Session persistence result

Result: Not validated.

Force-close/reopen behavior for an authenticated account remains blocked by the missing reachable HTTPS backend.

## 9. Offline authenticated result

Result: Not validated.

Authenticated offline launch remains blocked because no authenticated session could be created against HTTPS staging.

## 10. Cloud sync result

Result: Not validated.

The following sync surfaces remain blocked:

- Cloud profile sync
- Memory sync
- Health summary sync

## 11. AI runtime result

Result: Not validated.

Medibot and AI runtime with account context remain blocked. The backend staging env in the workspace also does not include a real `OPENAI_API_KEY`, and real keys should not be committed.

## 12. Bugs found

No new authenticated runtime bugs were found because authenticated runtime could not be reached.

Configuration issue found:

- Staging mobile RC config still pointed to `http://127.0.0.1:4000` from Phase 4A-2F local testing, which is not acceptable for release HTTPS staging validation.

## 13. Fixes implemented

Implemented:

- Updated `.env.staging` from local cleartext HTTP to HTTPS staging URL.
- Updated `eas.json` preview profile from local cleartext HTTP to HTTPS staging URL.
- Did not enable cleartext HTTP in release builds.
- Did not add secrets to the repo.
- Did not change AI architecture.

## 14. Security observations

- Release cleartext HTTP was not enabled.
- No OpenAI key was added to mobile or committed backend env files.
- No token or sensitive health-data leakage review could be completed for authenticated runtime because no authenticated HTTPS session was established.
- The documented backend deployment guidance correctly keeps OpenAI backend-only.
- The deployed staging backend should use secret-store values for `JWT_SECRET` and `OPENAI_API_KEY`, persistent storage for `DATABASE_URL`, and a restricted `CORS_ORIGIN`.

## 15. Remaining blockers

Authenticated RC validation remains blocked by the absence of a real reachable HTTPS staging backend.

Required before rerun:

- Deploy the backend to an HTTPS host.
- Configure deployment secrets for `JWT_SECRET` and `OPENAI_API_KEY`.
- Configure persistent `DATABASE_URL`.
- Configure an appropriate `CORS_ORIGIN`.
- Verify `/health` and `/status` over HTTPS from the validation machine.
- Replace `https://staging-api.healthy-you.example.com` with the real HTTPS backend URL if a different host is used.
- Rebuild the RC APK with the verified HTTPS URL embedded.
- Install the rebuilt APK and rerun authenticated runtime validation.

## 16. Beta readiness assessment

Not beta-ready.

Phase 4A-2G did not validate successful auth, session persistence, authenticated offline launch, reconnect recovery, cloud sync, Health Connect authenticated runtime, or AI runtime with account context against a real HTTPS staging backend.

## 17. Recommended next step

Provision a real HTTPS staging backend, then rerun Phase 4A-2G starting with `/health` and `/status` verification. Only after those endpoints pass should the RC APK be rebuilt, installed, and validated through the authenticated runtime checklist.

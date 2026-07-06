# Healthy You Closed Beta Monitoring Checklist

Use this checklist during the closed beta window for `v0.26.0-alpha`.

## Daily Monitoring

- [ ] Check staging backend health: `GET https://healthy-you-staging-backend.onrender.com/health`.
- [ ] Check staging backend status: `GET https://healthy-you-staging-backend.onrender.com/status`.
- [ ] Confirm `/status` reports `environment=staging`.
- [ ] Confirm `openAIConfigured=false` remains understood as accepted beta state unless backend config changes.
- [ ] Review tester signup and login reports.
- [ ] Review reported auth failures by tester, device, approximate time, and network condition.
- [ ] Review backend 4xx/5xx patterns in Render logs.
- [ ] Confirm no passwords, tokens, or sensitive wellness payloads appear in logs.
- [ ] Review new tester feedback submissions.
- [ ] Classify new reports as P0, P1, P2, or P3.
- [ ] Check whether any report involves a known deferred feature.
- [ ] Remind testers of known limitations when reports are expected beta-deferred behavior.
- [ ] Watch for security or privacy incidents.
- [ ] Confirm rollback artifact and previous known-good tag remain available.

## Crash And Logcat Monitoring

- [ ] Ask testers for device model, Android version, and exact time of crash.
- [ ] Request screenshots or videos only when safe to share.
- [ ] Request app-specific logcat for repeatable crashes when the tester can provide it.
- [ ] Scan crash logs for `FATAL EXCEPTION`, `ANR`, `TypeError`, `ReferenceError`, and `AndroidRuntime`.
- [ ] Distinguish app-specific `com.healthyyou.app` matches from unrelated Android system noise.
- [ ] Escalate launch crashes, login crashes, and supported-flow crashes as P0/P1 depending on blast radius.

## Weekly Monitoring

- [ ] Summarize tester count, active testers, devices, and Android versions.
- [ ] Summarize total issues and severity counts.
- [ ] Identify repeated feedback themes.
- [ ] Identify most tested and least tested screens.
- [ ] Review backend uptime and staging cold-start complaints.
- [ ] Review auth/register/login success trends.
- [ ] Review Medibot feedback and known AI fallback confusion.
- [ ] Review Nutrition, Fitness, Schedule, Profile, and Home/Data feedback.
- [ ] Review whether known limitations are clear enough.
- [ ] Decide whether a beta patch is needed.
- [ ] Update the issue tracker status and owner assignments.

## Backend Monitoring Details

Daily checks:

- `/health` should return HTTP 200 with healthy status.
- `/status` should return HTTP 200 with service identity and staging environment.
- Auth endpoints should not expose stack traces, tokens, or passwords in errors.
- Render logs should be reviewed for repeated 5xx errors or startup failures.

Accepted beta state:

- Staging backend is used for closed beta.
- `openAIConfigured=false` is acceptable while Medibot fallback remains safe.
- Local Phase 4C wellness data does not require backend sync.

## Patch Decision Review

Consider a beta patch when:

- Any P0 is confirmed.
- A P1 affects multiple testers or a primary beta workflow.
- A misleading deferred feature causes repeated confusion.
- Backend instability prevents normal tester onboarding.
- A privacy or safety issue needs immediate correction.

Do not patch for:

- Expected deferred Phase 5 features behaving as clearly deferred.
- One-off tester environment issues with a clear workaround.
- Cosmetic polish that can wait until after the beta window.

## Rollback Readiness

- [ ] Keep the exact distributed APK and SHA256 recorded.
- [ ] Keep the previous known-good tag identified.
- [ ] Keep tester contact list available for pause/rollback notices.
- [ ] Prepare a short message for pausing installs if a P0 appears.
- [ ] Preserve issue evidence before changing distribution links.

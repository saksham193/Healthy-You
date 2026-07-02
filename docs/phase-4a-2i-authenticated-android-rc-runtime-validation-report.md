# Phase 4A-2I Authenticated Android RC Runtime Validation Report

Date: 2026-07-02

## 1. Executive summary

Result: Authenticated Android RC validation resumed and mostly passed, but beta readiness is not approved.

The deployed HTTPS staging backend is healthy after the Phase 4A-2J auth stabilization. A fresh backend auth smoke passed, and the real Android release APK authenticated successfully against the Render staging backend. Fresh login, sanitized invalid-login UI, Health Connect grant/no-data handling, session persistence, authenticated offline launch, reconnect, Medibot screen open, and logout were validated on the release APK.

Remaining blockers are profile sync recovery and fresh offline/local AI response validation. After reconnect, the Profile account area continued to show `Offline changes saved` instead of returning to a fully synced profile state. A fresh Medibot offline prompt could not be submitted through ADB text injection, so generated offline/local AI behavior, memory sync, daily briefing, trends, recommendations, and preventive wellness are not fully validated.

Live OpenAI provider validation is skipped because staging reports `openAIConfigured=false`.

## 2. HTTPS URL tested

Result: Passed.

HTTPS staging backend tested:

`https://healthy-you-staging-backend.onrender.com`

Confirmed configuration:

- `.env.staging`: `EXPO_PUBLIC_API_BASE_URL=https://healthy-you-staging-backend.onrender.com`
- `eas.json` preview env: `EXPO_PUBLIC_API_BASE_URL=https://healthy-you-staging-backend.onrender.com`

No local HTTP backend, placeholder staging URL, debug/dev-client APK, or release cleartext traffic was used.

## 3. /health result

Result: Passed.

`GET https://healthy-you-staging-backend.onrender.com/health`

Observed:

- `status=ok`
- `timestamp=2026-07-02T11:42:53.204Z`

## 4. /status result

Result: Passed with OpenAI unavailable.

`GET https://healthy-you-staging-backend.onrender.com/status`

Observed:

- `service=healthy-you-backend`
- `environment=staging`
- `openAIConfigured=false`

Live OpenAI provider validation is not validated/skipped for this RC pass.

## 5. Auth backend smoke result

Result: Passed.

Fresh staging backend smoke after deployment:

- `/auth/register`: `201`
- `/auth/login`: `200`
- Invalid `/auth/login`: `401`
- Smoke account: `phase4a2i-report-1782992573820@example.com`

No auth response bodies or tokens were logged in the report output.

## 6. APK artifact tested

Result: Passed.

Artifact:

`android/app/build/outputs/apk/release/app-release.apk`

SHA-256:

`36922E1093DBF1D0BFE541E8797BAFA5DFFCBCD79619DCEE9931EE05AA4855E6`

Installed package:

- Package: `com.healthyyou.app`
- Launch activity: `com.healthyyou.app/.MainActivity`
- Version: `1.0.0`
- Version code: `1`

No rebuild was required because the release APK was newer than the staging mobile config files and already targeted the Render HTTPS backend.

## 7. Auth runtime result

Result: Passed.

Validated on the real release APK:

- Fresh authenticated login succeeded with `phase4a2i-ui-1782991729774@example.com`.
- Invalid credentials remained sanitized in the UI: `Email or password is incorrect.`
- Logout was reached from the authenticated Profile account section.
- Logout confirmation dialog appeared.
- Confirmed logout returned to the Login screen.

## 8. Session persistence result

Result: Passed.

After successful login, force-stop and reopen restored the authenticated Dashboard instead of returning to Login.

Evidence:

- `phase4a_2i_session_persistence_pass.xml`
- `phase4a_2i_session_persistence_pass.png`

## 9. Offline authenticated result

Result: Passed.

With airplane mode enabled and Wi-Fi/mobile data disabled, force-stop and reopen still restored the authenticated Dashboard. This validates cached authenticated launch behavior for the release APK.

Reconnect recovery partially passed: after airplane mode was disabled and Wi-Fi/mobile data were restored, the app stayed authenticated and navigation remained usable. Profile sync recovery did not fully clear, as noted in the Cloud sync and Bugs sections.

Evidence:

- `phase4a_2i_offline_authenticated_launch.xml`
- `phase4a_2i_offline_authenticated_launch.png`

## 10. Cloud sync result

Result: Partial, not beta-ready.

Passed observations:

- Authenticated Profile opened after reconnect.
- Health profile and summary data rendered.
- Health Connect no-data state appeared as `Synced no_data`.
- Health backup showed `Synced`.

Not fully validated or blocked:

- Profile account sync remained `Offline changes saved` after reconnect and a wait period.
- Memory sync was not validated because a fresh Medibot offline message could not be submitted.
- Manual account sync was not clearly exposed in the validated Account section.

Evidence:

- `phase4a_2i_profile_reconnected.xml`
- `phase4a_2i_profile_account_reconnected.xml`
- `phase4a_2i_profile_account_after_reconnect_wait.xml`

## 11. AI runtime result

Result: Partial, not beta-ready.

Passed observations:

- Medibot screen opened while offline.
- Medibot reported offline status.
- Existing seeded/cached conversation content rendered.

Not validated:

- Fresh offline/local AI generated response.
- Memory sync.
- Daily briefing generation.
- Trends generation.
- Recommendations generation.
- Preventive wellness generation.
- Live OpenAI provider behavior.

Reason: staging reports `openAIConfigured=false`, so live OpenAI validation is skipped. Fresh offline/local AI generation was attempted, but ADB text injection did not populate the Medibot input reliably enough to submit a new prompt. Existing seeded conversation content is not counted as proof of generated offline/local AI response.

Evidence:

- `phase4a_2i_medibot_offline_open.xml`
- `phase4a_2i_medibot_offline_open.png`
- `phase4a_2i_medibot_offline_response.xml`
- `phase4a_2i_medibot_offline_response2.xml`

## 12. Health Connect result

Result: Passed for granted/no-data state.

Validated:

- Health Connect permission sheet opened from the release APK.
- Full requested read permissions were granted.
- App returned to Healthy You after the permission flow.
- Profile/health state showed granted/no-data handling with `Synced no_data`.

Manual sync, if exposed outside the validated Account section, was not separately validated.

Evidence:

- `phase4a_2i_hc_allow_all.xml`
- `phase4a_2i_after_hc_return.png`
- `phase4a_2i_profile_reconnected.xml`

## 13. UI/navigation result

Result: Passed with AI input limitation.

Validated navigation:

- Login screen.
- Invalid-login sanitized error state.
- Authenticated Dashboard.
- Health Connect permission flow and return to app.
- Profile screen.
- Profile Account section.
- Medibot screen.
- Logout confirmation and return to Login.

No UI crash, ANR, or repeated app restart loop was observed. The only UI limitation in this pass was automated Medibot prompt entry through ADB.

## 14. Bugs found

1. Profile sync does not fully recover after reconnect.
   - After offline launch and reconnect, the Profile Account section still showed `Offline changes saved`.
   - Health backup separately showed `Synced`.
   - This should be treated as a beta blocker until the queued profile state flushes or the UI explains the pending state correctly.

2. Fresh offline/local AI response could not be validated through the current runtime automation path.
   - Medibot opened offline and showed offline status.
   - ADB text injection did not reliably populate the chat input, so a new prompt could not be submitted.
   - Existing seeded/cached conversation content is not sufficient evidence for generated offline/local AI.

## 15. Fixes implemented

No app, backend, Android network-security, or AI runtime fixes were implemented during this validation pass.

Documentation was updated to replace the stale backend-auth-blocked report with the post-stabilization RC runtime results.

## 16. Security/logging observations

Logcat scan after the authenticated release APK pass:

- JWT-like token matches: `0`
- Bearer header matches: `0`
- Access-token text matches: `0`
- Refresh-token text matches: `0`
- Raw health-history matches: `0`
- App fatal exceptions: `0`
- App ANRs: `0`
- React Native JS error/network failure lines: `0`

No JWT, access token, refresh token, Bearer authorization header, or raw health-history leakage was observed in logcat.

## 17. Remaining blockers

Blocking for beta:

- Profile sync recovery after reconnect remains unresolved because the Account section continued to show `Offline changes saved`.
- Fresh offline/local AI response generation is not validated.
- Memory sync, daily briefing, trends, recommendations, and preventive wellness remain not fully validated because fresh Medibot prompt submission did not complete.

Explicitly skipped:

- Live OpenAI provider validation, because `/status` reports `openAIConfigured=false`.

## 18. Beta readiness assessment

Not beta-ready.

The backend auth stabilization is verified, the release APK is correctly pointed at HTTPS staging, and the core authenticated runtime path is significantly healthier than the previous blocked pass. However, beta readiness should not be claimed until profile sync recovery and fresh offline/local AI behavior pass on the release APK.

## 19. Recommended next step

Fix or instrument the profile sync recovery path first, then rerun a narrow release-APK validation focused on:

- Offline launch.
- Reconnect.
- Profile sync flush.
- Memory sync.
- Fresh offline/local Medibot response.
- Daily briefing, trends, recommendations, and preventive wellness.

Keep live OpenAI provider validation marked skipped until staging reports `openAIConfigured=true`.

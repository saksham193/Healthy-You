# Phase 8B — Fully Functional Medibot AI Chatbot

## Summary

Phase 8B connects typed Medibot messages to the Phase 8A backend `/ai/chat` runtime while preserving local/offline fallback behavior. The mobile app now attempts backend AI chat first, displays the backend reply in the existing Medibot conversation UI, shows a safe AI mode label, and falls back to the existing local AI path when backend/provider access is unavailable.

## Starting checkpoint

- commit: a83a28e24daab4186d00acf581ed5476d1372482
- tag: v0.44.0-alpha

## Scope

- Medibot typed AI chat runtime
- backend `/ai/chat` integration
- provider status handling
- safe fallback behavior
- Android RC validation
- no attachment analysis runtime
- no voice/STT runtime
- no new mobile permissions

## Existing Medibot audit

- current UI: `src/screens/Assistant/AssistantScreen.tsx` already renders conversation history, typed input, thinking state, attachment banner, voice fallback, and medical disclaimer.
- current local fallback: `useMedibot` previously called `src/services/ai/aiService.ts`, which provides local/offline/direct metric fallback behavior.
- current attachment flow: attachment picker/banner and explicit consent flow existed and remains unchanged.
- current voice fallback: voice button still opens the foundation/unavailable status and does not request microphone permission.
- current AI service/provider setup: frontend local providers remain available for fallback; backend provider keys are not stored in the mobile app.
- backend `/ai/chat` route from Phase 8A: available with mock default provider, Ollama-compatible local provider foundation, request ID, fallback metadata, and safety notice.

## Implementation

- mobile AI runtime service: added `src/services/ai/medibotRuntimeService.ts` for `/ai/providers/status` and `/ai/chat`.
- Medibot send-message flow: `useMedibot` now adds the user message immediately, tries backend chat, displays the backend response, and falls back safely on failure.
- loading/fallback states: existing loading/thinking state remains; fallback responses are appended as assistant messages instead of blocking future sends.
- provider status display: existing status card now includes a small `AI mode` label for Demo, Local, Backend, or Fallback.
- safety notice handling: backend safety notice is preserved, and fallback responses include the general wellness boundary.
- backend compatibility fixes: none required.

## Runtime behavior

- mock provider: default backend path; no paid API required.
- Ollama provider through backend: supported through backend `AI_PROVIDER=ollama` without mobile changes.
- backend unavailable: mobile falls back to existing local AI response and labels runtime as fallback.
- provider unavailable: backend fallback is handled by Phase 8A; mobile also has local fallback if the route fails.
- rate limited: API error is caught and safe local fallback is shown.
- invalid response: normalized as unavailable and safe fallback is shown.
- offline/no network: safe local fallback is shown.

## Safety behavior

- wellness-only disclaimer: backend safety notice is preserved; fallback copy includes the wellness boundary.
- diagnosis/treatment boundary: backend guard handles unsafe prompts; local safety guard remains fallback protection.
- medication/dosage boundary: backend and local safety paths redirect dosage/change requests safely.
- emergency redirection: backend/local safety paths direct severe or urgent symptoms to local emergency help.
- self-harm safety handling if applicable: existing local safety and backend guard avoid harmful instructions and direct urgent support.

## Privacy/security

- no API keys in mobile app
- no prompt/response logging added
- no attachment upload expansion
- no voice recording
- no new permissions
- no auto/background sync
- no raw health records sent; Phase 8B omits health context summary and defers screen-specific AI context to Phase 8E

## Validation

- `npm.cmd run backend:build`: passed after applying the documented Node PATH fallback
- `npx.cmd tsc --noEmit`: passed
- `npm.cmd run typecheck`: passed
- `npm.cmd run backend:migrate`: passed; 3 applied migrations and 0 pending
- `npm.cmd run backend:migrate:status`: passed; 3 applied migrations and 0 pending
- `npm.cmd run backend:smoke:migrations`: passed
- `npm.cmd run backend:smoke:sync`: passed
- `npm.cmd run backend:smoke:hardening`: passed
- `npm.cmd run backend:smoke:monitoring`: passed
- `npm.cmd run backend:smoke:backup`: passed
- `npm.cmd run backend:smoke:ai`: passed
- `git diff --check`: passed with CRLF normalization warnings only
- `npm.cmd run build:android:rc:local`: passed after approved Gradle/dependency network access
- APK hash: `08B9871E58E8D3518C759002CC39448712AB3BE094E1DDC160C6556A5EA151B9`
- ABI/permission verification: passed

## Android QA APK

- source APK path: `android/app/build/outputs/apk/release/app-release.apk`
- copied QA APK path: `C:/Users/SAKSHAM GUPTA/Desktop/healthy-you-apk-feedback/HealthyYou-Phase8B-Medibot-AI-QA.apk`
- SHA256: `08B9871E58E8D3518C759002CC39448712AB3BE094E1DDC160C6556A5EA151B9`
- ABI: `arm64-v8a`, `x86_64`
- SDK: `minSdkVersion 26`, `targetSdkVersion 35`
- permission result: expected existing permissions only; `RECORD_AUDIO` absent
- observed permissions:
  - `android.permission.CAMERA`
  - `android.permission.READ_CALENDAR`
  - `android.permission.WRITE_CALENDAR`
  - `android.permission.READ_EXTERNAL_STORAGE` with `maxSdkVersion='32'`
  - `android.permission.WRITE_EXTERNAL_STORAGE` with `maxSdkVersion='32'`
  - `android.permission.POST_NOTIFICATIONS`

## Manual Android QA checklist

- Install successful: Yes
- App opens: Yes
- Crash: No
- No new permission prompt: Yes
- RECORD_AUDIO absent: Yes

- Medibot opens: Yes
- Typed message sends: Yes
- AI response appears: Yes
- Loading/thinking state appears: Yes
- Backend unavailable fallback safe: Not manually tested during Android QA; automated backend AI smoke/fallback validation passed
- Provider unavailable fallback safe: Not manually tested during Android QA; automated backend AI smoke/fallback validation passed
- Safety disclaimer visible or included: Yes
- Emergency/medical boundary copy safe: Not manually tested during Android QA
- No diagnosis/treatment claim: Yes
- No API key shown: Yes
- No raw backend/provider error shown: Yes

- Attachment existing flow still works: Yes
- Attachment not fully analyzed yet copy remains clear: Yes
- Voice fallback still works without mic permission: Yes

- Nutrition logging still works: Yes
- Fitness logging still works: Yes
- Custom routines/reminders still work: Yes
- Cloud Sync still manual-only: Yes
- No auto-sync on screen open: Yes

## Android QA notes

- Medibot AI mode showed `Demo`.
- Typed question sent successfully.
- AI demo response appeared.
- Attachment card/fallback remained clear.
- Voice fallback dialog appeared safely and stated no audio recording, upload, or transcript.
- Backend/provider unavailable fallback was not manually tested on device, but automated AI smoke covered fallback behavior and passed.

## Deferred

- Phase 8C attachment analysis runtime
- Phase 8D voice/STT runtime
- Phase 8E AI screen integrations

## Result

Passed Android runtime QA. No P0/P1 blockers remain. Phase 8B can close. Commit/tag/push are pending final validation.

## Files changed

- `README.md`
- `src/hooks/useMedibot.ts`
- `src/screens/Assistant/AssistantScreen.tsx`
- `src/services/ai/medibotRuntimeService.ts`
- `src/types/index.ts`
- `docs/phase-8b-medibot-ai-chatbot-runtime-report.md`

## Next phase

Phase 8C — Attachment Analysis Runtime

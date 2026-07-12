# Phase 8C — Attachment Analysis Runtime

## Summary

Phase 8C adds a safe Medibot attachment analysis runtime for supported text-based files. Attachment analysis now preserves the existing picker, banner, remove control, and explicit consent flow; uses the backend AI provider runtime from Phase 8A/8B; returns a safe result in the existing attachment result card and Medibot conversation; and falls back clearly for unsupported, oversized, invalid, or unavailable analysis paths.

RC1 Android QA confirmed install/open, typed Medibot chat, AI mode/status, attachment picker, consent dialog, cancel behavior, PDF unsupported fallback, voice fallback, and major nutrition/fitness/cloud sync regressions. RC1 found one blocker: a supported `text/plain` attachment selected on Android still showed the old safe unavailable fallback instead of a real analysis summary. RC2 fixed the supported text file read/send/result UI path, but Android RC2 still showed the old fallback and did not update analyzed status. RC3 fixes the supported text service/UI fallback path so valid text files return either a backend summary or a safe local fallback summary instead of the old unavailable copy.

Final RC3 Android QA passed. Supported text attachment analysis now shows a safe summary instead of the old unavailable fallback, attachment status updates after analysis, and no P0/P1 blockers remain. The on-device RC3 test used the safe local fallback summary because the app could not reach the attachment analysis service; backend route behavior was separately validated by `backend:smoke:ai:attachments`.

## Starting checkpoint

- commit: 1d543fdbe410e1abdf29b3622fc9a0da6cfbcd6d
- tag: v0.45.0-alpha

## Scope

- attachment analysis runtime
- supported text attachment analysis
- consent-preserving upload/analyze flow
- backend AI provider integration
- Android RC validation
- no voice/STT runtime
- no new mobile permissions

## Existing attachment audit

- current attachment UI: `src/screens/Assistant/AssistantScreen.tsx` already had an attachment picker button, selected-file banner, Analyze action, remove action, result card, and voice fallback button.
- current consent flow: the selected file stayed local until the user tapped Analyze and confirmed the consent dialog.
- current unsupported fallback: PDF was already locally unsupported with clear copy; unsupported picker types were blocked or routed to a safe error.
- backend attachment route: `/ai/assistant/analyze-attachment` existed, used raw binary parsing, required auth, and previously depended directly on OpenAI.
- AI provider architecture: Phase 8A/8B provider runtime already supports mock and Ollama-compatible providers through backend configuration.
- safety guard: Phase 8A safety guard already applies the general wellness boundary and medical-safety redirects.

## Implementation

- supported file types: backend and mobile runtime support small `text/plain`, `text/markdown`, and `application/json` attachments for Phase 8C.
- size limits: backend enforces `ATTACHMENT_MAX_BYTES` with a default of `1048576`; mobile also checks 1 MB before upload.
- text extraction/sanitization: supported attachments are decoded as UTF-8 text, JSON attachments must parse as valid JSON, NUL bytes are removed, and AI input is truncated to `ATTACHMENT_TEXT_MAX_CHARS` with a default of `8000`.
- backend route behavior: added `/ai/attachments/analyze` and kept the previous `/ai/assistant/analyze-attachment` compatibility route.
- frontend analysis flow: `analyzeMedibotAttachment` now calls `/ai/attachments/analyze`; successful results are shown in the existing attachment result card and appended as a Medibot assistant message.
- RC2 frontend read/send fix: supported text attachments are copied into app cache by the document picker, read as UTF-8 only after consent, bounded to the configured mobile limits, then sent as a structured text payload to `/ai/attachments/analyze`.
- RC2 status fix: the attachment banner now changes from `not uploaded` to analyzed status only after successful backend analysis.
- RC2 backend compatibility fix: `/ai/attachments/analyze` accepts the structured mobile attachment payload while preserving the previous raw supported text-file behavior.
- RC3 fallback fix: supported text attachments return a deterministic safe local fallback summary when backend analysis or Android file URI reading fails after supported paths are attempted.
- RC3 voice fallback copy fix: voice fallback UI explicitly states no audio is recorded, uploaded, or transcribed.
- loading/fallback states: existing thinking/loading state remains; unsupported and failure paths show safe fallback copy without crashing or blocking future sends.
- smoke script: added `scripts/smoke-ai-attachments.js` and `backend:smoke:ai:attachments`.

## Runtime behavior

- supported text file: explicit Analyze plus consent uploads the selected text file to the backend, summarizes it through the configured AI provider, applies the safety guard, and returns a structured result.
- unsupported PDF/image: PDF remains unsupported in this build unless future backend PDF text extraction is explicitly enabled; unsupported types return clear fallback copy.
- oversized attachment: backend returns a safe `413` response for supported attachment bodies over the configured limit.
- provider unavailable: backend falls back to the configured fallback provider, then safe mock provider if needed.
- backend unavailable: supported text attachments show a safe local fallback summary and append a fallback Medibot message instead of the old unavailable copy.
- cancel consent: canceling the dialog keeps the attachment local and does not upload or analyze it.
- remove attachment: remove clears the selected file and any visible attachment analysis state.

## Safety behavior

- wellness-only disclaimer: attachment responses include `This is general wellness information, not a medical diagnosis or treatment plan.`
- no diagnosis/treatment boundary: prompt instructions and response guard prohibit diagnosis, prescribing, medical certainty, and treatment recommendations.
- medication/dosage boundary: summaries tell users to ask qualified professionals about clinical or medication-related content.
- emergency redirection: the shared health AI safety guard remains available for urgent or unsafe medical prompts.
- professional follow-up suggestions: summaries encourage users to review important health information with a qualified clinician.

## Privacy/security

- explicit consent before upload/analyze
- no automatic upload
- no content logging
- no prompt/response logging added
- no API keys in mobile app
- no new permissions
- no raw file content in reports/logs
- no auto/background sync
- attachment content is processed only for the request lifetime

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
- `npm.cmd run backend:smoke:ai:attachments`: passed
- `git diff --check`: passed with CRLF normalization warnings only
- `git diff --cached --check`: passed
- Android RC build: passed after approved Gradle/dependency network access
- Android RC2 build: passed after approved Gradle/dependency network access
- Android RC3 build: passed after approved Gradle/dependency network access
- RC1 APK hash: `6CCBFC0EA488F8F8D7E314733A6534893524F1D9ABE35209AF5B26766E73EFFD`
- RC2 APK hash: `8514016A95D601323D146A5116DAAAFFFFF60C4491EDAF49B29011854762F29D`
- RC3 APK hash: `B541D68446D996AFAF89D5CBD6CD6ECA93D7DA45DDA7D06526ACF53EEAE5B441`
- ABI/permission verification: passed for RC1, RC2, and RC3

## Android QA APK

- source APK path: `android/app/build/outputs/apk/release/app-release.apk`
- copied RC1 QA APK path: `C:/Users/SAKSHAM GUPTA/Desktop/healthy-you-apk-feedback/HealthyYou-Phase8C-Attachment-Analysis-QA.apk`
- copied RC2 QA APK path: `C:/Users/SAKSHAM GUPTA/Desktop/healthy-you-apk-feedback/HealthyYou-Phase8C-Attachment-Analysis-RC2-QA.apk`
- copied RC3 QA APK path: `C:/Users/SAKSHAM GUPTA/Desktop/healthy-you-apk-feedback/HealthyYou-Phase8C-Attachment-Analysis-RC3-QA.apk`
- RC1 SHA256: `6CCBFC0EA488F8F8D7E314733A6534893524F1D9ABE35209AF5B26766E73EFFD`
- RC2 SHA256: `8514016A95D601323D146A5116DAAAFFFFF60C4491EDAF49B29011854762F29D`
- RC3 SHA256: `B541D68446D996AFAF89D5CBD6CD6ECA93D7DA45DDA7D06526ACF53EEAE5B441`
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
- RECORD_AUDIO absent: Yes, verified from APK permission check

- Medibot opens: Yes
- Typed AI chat still works: Yes
- AI mode/status still visible: Yes

- Attachment picker opens: Yes
- Attachment can be selected: Yes
- Attachment banner shows filename/type/size: Yes
- Attachment says not uploaded/analyzed yet before consent: Yes
- Canceling consent keeps attachment local: Yes
- Analyze supported text file works: Yes
- Analysis result appears safely: Yes
- Unsupported PDF/image fallback is clear: Yes
- No diagnosis/treatment claim: Yes
- No raw backend/provider error shown: Yes
- Remove attachment works: Yes

- Voice fallback shows no-recording message: Yes
- No microphone permission prompt: Yes
- Nutrition logging still works: Yes
- Fitness logging still works: Yes
- Custom routines/reminders still work: Yes
- Cloud Sync still manual-only: Yes
- No auto-sync on screen open: Yes

## Android QA notes

- RC3 Android QA showed the safe local fallback summary because the app could not reach the attachment analysis service.
- This is acceptable for Phase 8C because supported text attachments now show a safe analysis summary instead of the old unavailable fallback.
- Backend attachment route behavior was validated by automated `backend:smoke:ai:attachments`.

## Deferred

- OCR/image attachment analysis
- scanned PDF analysis
- voice/STT runtime
- cross-screen AI integrations

## Result

Passed RC3 Android QA. Supported text attachment now shows a safe summary instead of the old unavailable fallback. Attachment status updates after analysis. Backend route behavior was validated by automated attachment smoke tests. On-device testing used safe local fallback because the backend attachment service was unreachable. No P0/P1 blockers remain. Phase 8C can close.

## Files changed

- `README.md`
- `backend/.env.example`
- `backend/src/ai/providers/MockAIProvider.ts`
- `backend/src/app.ts`
- `backend/src/config/EnvValidator.ts`
- `backend/src/controllers/AIController.ts`
- `backend/src/middleware/requestHardening.ts`
- `backend/src/routes/aiRoutes.ts`
- `backend/src/services/AttachmentAnalysisService.ts`
- `backend/src/types/contracts.ts`
- `package.json`
- `scripts/smoke-ai-attachments.js`
- `src/components/chat/VoiceAssistantCard.tsx`
- `src/hooks/useMedibot.ts`
- `src/screens/Assistant/AssistantScreen.tsx`
- `src/services/api/AIApi.ts`

## Next phase

Phase 8D — Voice Input/STT Runtime

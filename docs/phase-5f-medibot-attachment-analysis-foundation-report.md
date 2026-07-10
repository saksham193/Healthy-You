# Phase 5F — Medibot Attachment Analysis Foundation

## Summary

Phase 5F adds a safe Medibot attachment analysis foundation. Users can select a supported attachment, see the existing local attachment banner, explicitly choose Analyze, review a consent dialog before upload, and receive either a safe AI-generated summary or a safe unavailable fallback.

This phase does not add diagnosis, treatment advice, lab-result accuracy claims, hidden uploads, attachment persistence, or automatic saving into health records.

## Starting checkpoint

- commit: bed56fc66bc0fd222848721be6e90d9e3558865d
- tag: v0.33.0-alpha

## Scope

- Add authenticated backend attachment analysis route.
- Add backend validation for supported text-like attachment uploads.
- Add frontend Analyze Attachment action behind explicit consent.
- Preserve normal Medibot typed chat.
- Preserve the local selected attachment banner.
- Defer PDF analysis instead of faking parsing.
- Record completed user-confirmed Mi phone runtime QA.

Out of scope:

- Full medical report interpretation.
- Diagnosis or treatment decision support.
- Medication change advice.
- Lab-report accuracy claims.
- Attachment persistence or background upload.
- New Android permissions.

## Backend implementation

- route: `POST /ai/assistant/analyze-attachment`
- controller: `AIController.analyzeAssistantAttachment`
- service: `AttachmentAnalysisService`
- authentication: matches existing AI routes with `requireAuth`.

Supported file types:

- `text/plain`
- `text/markdown`
- `text/csv`
- `application/json`

Size limits:

- text-like files: 1 MB.
- PDF analysis: deferred and unsupported in this build.

Error behavior:

- unauthenticated request: `401`
- missing file: `400 missing_attachment`
- unsupported file type: `400 unsupported_attachment_type`
- oversized file: `413 payload_too_large`
- OpenAI unavailable: `503 ai_attachment_analysis_unavailable`
- unexpected provider or response failure: safe `502` error with manual Medibot fallback copy.

## Frontend implementation

- attachment banner: still shows selected filename, type, size, and local no-upload status.
- explicit Analyze Attachment action: visible only when an attachment is selected.
- consent dialog: appears before upload and states the file will not be saved automatically and is not medical advice.
- loading state: disables duplicate analyze taps while upload/analysis is in progress.
- success behavior: shows an attachment summary result card with safety note and limitations.
- fallback behavior: shows a safe attachment analysis fallback while keeping the selected attachment banner and typed Medibot chat available.
- PDF behavior: shows `PDF attachment analysis is not available in this build. You can ask Medibot manually or upload a supported text file.`
- network/unavailable behavior: shows `Attachment analysis is not available in this build. You can still ask Medibot manually.`

## Privacy and safety

- no hidden upload.
- no upload before explicit Analyze and consent.
- no raw file logging.
- no file-content logging.
- no extracted attachment text logging.
- no base64 logging.
- no attachment persistence.
- no API key exposure to mobile.
- no diagnosis claims.
- no medical advice claims.
- no lab-report accuracy claims.
- no auto-save into records.
- safe unavailable fallback remains available.

## Validation

- `npm.cmd run backend:build`: passed after applying the requested Node helper PATH.
- `npx.cmd tsc --noEmit`: passed after applying the requested Node helper PATH.
- `npm.cmd run typecheck`: passed after applying the requested Node helper PATH.
- `git diff --check`: passed with expected LF-to-CRLF warnings only.
- `npm.cmd run build:android:rc:local`: passed after allowing Gradle wrapper network access.
- APK SHA256: `1C47632B2E1A24EEC9B1223571F1B887B2F0C990D020FA1F48B82AE2B0FF9055`
- ABI verification: `native-code: 'arm64-v8a' 'x86_64'`
- SDK verification: `sdkVersion:'26'`, `targetSdkVersion:'35'`
- Permission verification: `CAMERA`, `READ_CALENDAR`, `WRITE_CALENDAR`, and `POST_NOTIFICATIONS` present.
- RECORD_AUDIO absent: passed.

## Runtime QA checklist

RC2 Mi phone runtime QA passed with user confirmation:

- install successful: Yes
- app opened: Yes
- crash: No
- Medibot attachment flow still works: Yes
- Food Scan fallback still works: Yes
- existing reminders still work: Yes
- voice deferred dialog works: Yes
- no microphone permission prompt: Yes
- Add Reminder quick action opens new routine flow: Yes
- old "coming after beta" Add Reminder message removed: Yes
- enable custom reminder works: Yes
- reschedule custom reminder works: Yes
- disable custom reminder works: Yes
- Profile clear-all reminders turns custom toggles off: Yes
- notification text privacy-safe: implementation verified; not manually checked in notification shade
- logcat fatal errors: not checked because ADB/logcat was unavailable, but no visible crash occurred

Notification shade text was not manually checked, but implementation was verified to use privacy-safe generic text only:

- title: `Healthy You reminder`
- body: `Time to check your wellness routine.`

Logcat was not checked because ADB/logcat was unavailable. No visible runtime crash occurred during RC2 QA.

Fixed RC1 P1 blockers:

- custom reminder enable
- custom reminder reschedule
- custom reminder disable
- stale Add Reminder "coming after beta" quick-action copy

## Result

Passed after user-confirmed RC2 Mi phone runtime QA.

No P0/P1 blockers remain.

Phase 5F, 5G, 5H, and 5I can close.

## Files changed

- `backend/src/controllers/AIController.ts`
- `backend/src/routes/aiRoutes.ts`
- `backend/src/types/contracts.ts`
- `backend/src/services/AttachmentAnalysisService.ts`
- `src/screens/Assistant/AssistantScreen.tsx`
- `src/services/api/AIApi.ts`
- `src/services/media/documentPickerService.ts`
- `docs/phase-5f-medibot-attachment-analysis-foundation-report.md`

## Next phase

Phase 5G — Voice Input / Speech-to-Text

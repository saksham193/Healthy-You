# Phase 5A Advanced Feature Technical Planning Report

Date: July 8, 2026

## 1. Executive Summary

Phase 5A is a planning-only phase for the next advanced Healthy You features: Food Scan, Medibot voice input, Medibot attachments, smart reminders and notifications, and calendar integration.

No feature implementation is recommended before a permission and package readiness pass is explicitly approved. The current beta is stable enough to keep tester feedback running in parallel, but these features expand the app into sensitive device permissions, media capture, file handling, notification delivery, and calendar data. They should be phased deliberately.

Recommended first implementation: local notification reminders for existing medication, habit, hydration, and sleep reminder data. This is the smallest useful Phase 5 feature because it can build on the existing Schedule and Nutrition local stores without changing the AI provider contract or handling user media.

## 2. Scope

In scope:

- Audit current app, backend, AI, native permission, and beta limitation state.
- Inventory deferred advanced features.
- Identify candidate packages and native permission impact.
- Define backend, privacy, security, and QA requirements.
- Recommend implementation order.

Out of scope:

- Installing packages.
- Adding native permissions.
- Implementing screens, services, backend endpoints, or AI schema changes.
- Redesigning UI.
- Changing auth, backend, or AI architecture.
- Inventing beta feedback.

## 3. Current Roadmap Position

Current checkpoint:

- Branch: `main`
- Commit: `0eb5e21`
- Tag: `v0.29.0-alpha`
- Current beta APK: `Healthy-You-v0.29.0-alpha.apk`
- Current beta APK SHA256: `0542EE30CA9574B46877503CCB0FE173F103F1CFE2ACF110B006EAF3716413AA`

Phase 4 completed closed beta readiness, then Phase 4I fixed the Android real-device ABI packaging issue. Phase 5 should now move from beta stabilization into carefully scoped advanced features while live tester feedback continues separately.

## 4. Current Beta Status

Known beta status provided by the owner:

- Real-device install manually verified on a Mi phone.
- App opened without crash.
- Medibot responded correctly.

Current source-audited behavior:

- Food Scan is visible as a Nutrition quick action but shows a beta-safe deferred alert and routes users to manual meal logging.
- Medibot attachment and microphone controls show beta-safe deferred alerts.
- Schedule supports local habit completion and medication taken/skipped logs.
- Notifications, push delivery, calendar sync, custom schedule setup, custom medication setup, and custom habit setup are deferred.
- `docs/beta-known-limitations.md` explicitly lists Food Scan, voice input, attachments, notifications/reminder delivery, and calendar integration as deferred.

No new tester feedback was available during this planning pass.

## 5. Deferred Feature Inventory

| Feature | Current beta behavior | Desired future behavior | Phase recommendation | Wait for more beta feedback? |
| --- | --- | --- | --- | --- |
| Food Scan / photo meal detection | Nutrition `Scan Food` shows a deferred alert and offers manual meal logging. | Capture or select a meal photo, analyze likely foods and portions, return editable calories/macros, and save only after user confirmation. | Phase 5C, after package/permission foundation. | Can start technical foundation after 5B; full AI accuracy tuning should wait for feedback on nutrition logging pain points. |
| Medibot voice input | Mic button animates listening briefly and shows deferred alert. | Record short voice prompts, transcribe to text, show editable transcript, then send through existing Medibot text pipeline. | Phase 5D. | Prefer after feedback on Medibot text usage and after microphone permission UX is reviewed. |
| Medibot attachments | Attach button shows deferred alert. | Pick documents/images, validate type/size, extract safe text or send supported media, summarize in Medibot with user confirmation. | Phase 5D or 5E depending on backend readiness. | Yes. Attachments create privacy and safety risks; wait for clear tester demand. |
| Medication, habit, hydration reminders | Schedule cards and Nutrition hydration tracking are local only; no delivered notifications. | User-controlled local reminders with permission fallback, quiet hours, reschedule/cancel behavior, and visible reminder state. | Phase 5B. | No need to wait; this directly supports existing local workflows. |
| Calendar integration | Static/mock appointment cards exist; `Book Appointment` shows deferred custom schedule copy. | Add appointments to device calendar or open system calendar UI; later read appointments only with explicit consent. | Phase 5E. | Yes. This should wait until reminder UX is validated. |

## 6. Food Scan Technical Plan

Current behavior:

- `src/constants/mockData.ts` includes `scan-food`.
- `src/screens/Nutrition/NutritionScreen.tsx` handles scan actions with a deferred alert.
- Manual meal logging persists locally through `src/store/nutritionStore.ts`.

Desired behavior:

- Let users choose `Take Photo` or `Choose From Library`.
- Resize/compress image before upload.
- Submit image to a backend food-scan endpoint.
- Return structured candidates: meal title, food items, calories, protein, carbs, fat, confidence, uncertainty notes, and safety disclaimer.
- Present an editable review form before saving through the existing meal store.
- Store only confirmed meal data by default; avoid retaining raw images unless a future explicit diagnostics setting is added.

Frontend changes:

- Add Food Scan flow behind the existing Nutrition action.
- Add scan state: permission needed, capture/selecting, uploading, analyzing, review, save, failure.
- Reuse the existing `MealFormState` and `addMeal` path after analysis.
- Add explicit "Edit before saving" UX and low-confidence messaging.

Backend changes:

- Add a dedicated authenticated endpoint such as `POST /nutrition/food-scan` or `POST /ai/vision/meal`.
- Accept multipart image upload or base64 payload with strict size/type limits.
- Run image analysis through a vision-capable provider and return a validated JSON schema.
- Add audit logging without raw image content.
- Avoid mixing food-scan prompts into the current text-only `/ai/message` contract until the schema is intentionally extended.

Package candidates:

- `expo-image-picker`: camera and image library selection. Expo docs note camera permission hooks and that `launchCameraAsync` requires camera permission. They also document iOS camera/photo usage strings. See https://docs.expo.dev/versions/latest/sdk/imagepicker/.
- `expo-image-manipulator`: resize/compress images before upload.
- `expo-file-system`: read/copy temporary image files when needed.
- Backend upload parser candidate: `multer` or `busboy`, only if multipart upload is selected.

Permissions:

- Android: `CAMERA` for capture. Image library selection should use Android's picker where possible; avoid broad storage permissions.
- iOS: `NSCameraUsageDescription` and `NSPhotoLibraryUsageDescription`.

Privacy/security risks:

- Meal photos can reveal faces, home, location, medication labels, receipts, or sensitive diet information.
- AI nutrition estimates may be wrong; never auto-save or present as clinical advice.
- Uploads must have file size limits, MIME sniffing, timeout limits, and raw-image retention policy.

Testing requirements:

- Permission allow/deny/permanently denied paths.
- Camera capture, gallery selection, cancel flow, Android activity restoration via `ImagePicker.getPendingResultAsync`.
- Large image rejection and offline fallback.
- AI JSON schema validation and low-confidence copy.
- Save/edit/delete confirmed meal from analysis.
- Release APK ABI and permission badging inspection after adding packages.

Recommended placement:

- Phase 5B can prepare shared permission and upload planning if needed.
- Phase 5C should implement Food Scan after reminders or after a small image-picker proof pass.

Before or after beta feedback:

- Implement foundation after Phase 5B; tune output and prioritization after testers confirm manual meal logging friction.

## 7. Voice Input Technical Plan

Current behavior:

- `src/screens/Assistant/AssistantScreen.tsx` has a mic button that shows a deferred alert.
- `VoiceAssistantCard` is presentation-only for beta.
- `sendMessage(message: string)` and backend `/ai/message` are text-only.

Desired behavior:

- Tap mic, request microphone permission, record a short prompt, transcribe it, show editable transcript, then send through the existing text Medibot flow.
- Do not send raw audio directly into Medibot chat history.
- Keep recordings short and delete local temporary files after transcription.

Frontend changes:

- Add recording state to Assistant: idle, requesting permission, recording, processing, transcript review, error.
- Add duration cap, cancel, retry, and transcript edit.
- Preserve current text input as fallback.

Backend changes:

- Preferred: authenticated `POST /ai/transcribe` endpoint that accepts audio and returns transcript text.
- Reuse existing OpenAI backend secret handling; do not expose transcription credentials on-device.
- Add upload limits and audit metadata.
- Keep `/ai/message` text-only until transcript is accepted by the user.

Package candidates:

- `expo-audio`: Expo's current audio package supports recording and has config plugin options for microphone permission and Android `RECORD_AUDIO`; docs also warn background recording adds foreground-service and notification permissions. See https://docs.expo.dev/versions/latest/sdk/audio/.
- `@react-native-voice/voice`: possible native speech-recognition alternative, but higher native/config risk than a server-side transcription path.
- Backend upload parser candidate: `multer` or `busboy`.

Permissions:

- Android: `RECORD_AUDIO`.
- iOS: `NSMicrophoneUsageDescription`.
- Avoid background recording in the first version to avoid foreground service and notification complexity.

Privacy/security risks:

- Voice may contain protected health information, bystanders, location, or family details.
- Audio should be short-lived and not stored by default.
- Must clearly show recording state.

Testing requirements:

- Permission allow/deny/permanently denied paths.
- Record/cancel/retry, interruption handling, airplane mode/offline behavior.
- Transcript editing before send.
- No lingering recording after navigation or app background.
- Backend upload size/time limits and transcription failure fallback.

Recommended placement:

- Phase 5D after notification reminders and Food Scan foundation.

Before or after beta feedback:

- After more beta feedback, unless Medibot typing friction becomes a major tester blocker.

## 8. Attachment Input Technical Plan

Current behavior:

- Assistant attach button shows a deferred alert.
- `AIRequest` has no attachment metadata.
- Backend `aiRequestSchema` validates text-only message, prompt, context, conversation, and trace ID.

Desired behavior:

- Let users pick a limited set of files or images.
- Show filename, type, size, and a privacy warning.
- Extract text or send supported file/image content through a controlled backend endpoint.
- Ask Medibot questions over the extracted content while preserving medical safety guard behavior.

Frontend changes:

- Add attachment picker state and preview row.
- Restrict accepted MIME types in the first version: images and plain text/PDF only if extraction is implemented.
- Require user confirmation before upload.

Backend changes:

- Add authenticated attachment upload endpoint with file limits and content-type validation.
- Add extraction pipeline for text/PDF or file input support through the AI provider.
- Extend AI schema carefully with attachment summaries, not raw arbitrary file blobs.
- Update audit logs to record metadata only.

Package candidates:

- `expo-document-picker`: system document UI; docs note `copyToCacheDirectory` should be true when another Expo API needs immediate file access. See https://docs.expo.dev/versions/latest/sdk/document-picker/.
- `expo-file-system`: local file size checks, cache reads, and cleanup.
- `expo-image-picker`: if image attachment is separate from document attachment.
- Backend parser/extractor candidates: `multer` or `busboy`; PDF/text extractor only after file type scope is finalized.

Permissions:

- Android: document picker via system UI should avoid broad storage permissions for basic selection.
- iOS: no broad file permission for basic document picker; iCloud support may require iCloud capability/entitlement if enabled.
- Images may require camera/photo permissions if image capture/library support is included.

Privacy/security risks:

- Attachments can include lab reports, prescriptions, IDs, addresses, or unrelated personal files.
- Need malware-like file hygiene: type sniffing, size caps, no executable formats, no persistent raw storage by default.
- Medibot must avoid diagnosis and medication changes from uploaded documents.

Testing requirements:

- Accepted/rejected file types and size limits.
- Cancel flow, missing file URI, deleted temp file, offline mode.
- Upload timeout and backend validation.
- Medical safety response for prescriptions/labs.
- Local cache cleanup.

Recommended placement:

- Phase 5D if limited to image/text and no persistent storage.
- Phase 5E or later if PDF/lab-report analysis is desired.

Before or after beta feedback:

- After beta feedback. This is high privacy/high safety surface.

## 9. Notifications/Reminders Technical Plan

Current behavior:

- Schedule shows medications, habits, hydration, sleep, appointments, and action cards.
- Users can mark habits complete and medications taken/skipped locally.
- No local notification scheduling exists.
- `app.json` does not include notification permissions or `expo-notifications`.

Desired behavior:

- Users opt into reminder delivery.
- Schedule existing medication/habit/hydration/sleep items as local notifications.
- Tap notification to open the relevant screen.
- Respect denied permissions with in-app reminders only.
- Avoid exact alarms in the first version unless a specific medication timing requirement justifies it.

Frontend changes:

- Add reminder permission/status card in Schedule or Profile permissions area.
- Add local notification service with schedule/cancel/reschedule primitives.
- Persist reminder preferences separately from completion logs.
- Use existing Schedule and Nutrition stores as sources for initial reminder templates.

Backend changes:

- None for first local-notification version.
- Future remote push reminders would need token registration, backend scheduler, opt-out, and device token lifecycle handling.

Package candidates:

- `expo-notifications`: local notifications, notification channels, scheduling, and response listeners. Expo docs note local notifications remain available in Expo Go, while push notifications on Android require a development build; config plugin/native settings are needed for push setup. See https://docs.expo.dev/versions/latest/sdk/notifications/.
- `@react-native-community/datetimepicker`: optional for reminder time editing.

Permissions:

- Android: Android 13+ notification runtime prompt; `RECEIVE_BOOT_COMPLETED` is added by `expo-notifications`; avoid `SCHEDULE_EXACT_ALARM` at first.
- iOS: notification authorization prompt; no Info.plist usage description string required for standard notification permission.

Privacy/security risks:

- Notification text can expose medication names or health habits on lock screen.
- Need privacy-friendly default copy such as "Healthy You reminder" with optional detail toggle.
- Reminder timing can imply health conditions.

Testing requirements:

- Permission allow/deny flow.
- Android notification channel creation before permission/token path.
- Schedule, cancel, reschedule, and app restart behavior.
- Tap-to-open behavior with React Navigation.
- Lock-screen copy privacy.
- Time-zone and date rollover checks.
- Release APK permission/badging inspection after adding package.

Recommended placement:

- Phase 5B first implementation.

Before or after beta feedback:

- Can proceed before full feedback because it supports existing beta workflows and does not require AI/media backend expansion.

## 10. Calendar Integration Technical Plan

Current behavior:

- Appointment cards are static/mock data.
- `Book Appointment` shows a deferred custom schedule message.
- No calendar package or permissions are declared.

Desired behavior:

- First version: create appointment events through system calendar UI or write-only access, after explicit consent.
- Later version: optional calendar read/sync to show upcoming health appointments.

Frontend changes:

- Add appointment creation/edit flow from Schedule.
- Add "Add to Calendar" action from appointment cards.
- Separate "write calendar event" from "read calendar events" because read access is much more sensitive.

Backend changes:

- None for device-local calendar write.
- Future cloud appointment sync would require a calendar event model and conflict handling.

Package candidates:

- `expo-calendar`: device calendar APIs and permission hooks. Expo docs state Android direct calendar access requires `READ_CALENDAR` and `WRITE_CALENDAR`, while system-provided calendar UI does not require permissions if that is the only path. See https://docs.expo.dev/versions/latest/sdk/calendar/.

Permissions:

- Android: no permission if only launching system calendar UI; `READ_CALENDAR`/`WRITE_CALENDAR` if reading/writing directly.
- iOS: calendar usage descriptions; use write-only access first when possible.

Privacy/security risks:

- Calendar read access exposes non-health life events, locations, contacts, and routines.
- Write access can create unwanted duplicates or reminders.
- Must provide clear event preview and easy cancellation.

Testing requirements:

- Permission allow/deny/write-only/full access paths.
- Event creation, duplicate prevention, deletion/update if supported.
- System calendar absence or unsupported provider behavior.
- Time zone and recurrence handling.

Recommended placement:

- Phase 5E after reminders, because notification scheduling and reminder preferences should be stable first.

Before or after beta feedback:

- After beta feedback and after appointment management requirements are clearer.

## 11. Required Package Candidates

| Package candidate | Needed for | Expo compatibility concerns | Native build impact | Permission prompts | Denied fallback |
| --- | --- | --- | --- | --- | --- |
| `expo-notifications` | Local reminders and future push notification handling. | Must verify SDK-compatible version with `npx expo install`; push notifications on Android need development/release builds, not Expo Go. | Adds notification native module, boot receiver behavior, channels, and config plugin options. | Android 13+ notification prompt; iOS notification prompt. | Keep in-app reminder cards and badges; allow manual habit/medication logging. |
| `@react-native-community/datetimepicker` | Reminder time editing. | Use Expo-compatible install path; verify RN 0.85 compatibility. | Adds native UI picker module. | None directly. | Use simple preset reminder times until picker available. |
| `expo-image-picker` | Food Scan camera/photo selection; optional image attachments. | Requires config plugin strings; handle Android activity destruction with pending result check. | Adds image picker native module and camera/photo permission configuration. | Camera for capture; iOS photo usage where needed. | Manual meal logging and text-only Medibot remain available. |
| `expo-image-manipulator` | Compress/resize meal images before upload. | Verify SDK-compatible version. | Native image processing module. | None directly. | Upload original only if size safe; otherwise ask user to choose a smaller image. |
| `expo-file-system` | Read temp images/documents, inspect size, cleanup cache. | Already present transitively through Expo modules but should be added directly when imported by app code. | Native file access module. | App-scoped file operations avoid broad storage permission. | Disable upload and ask user to retry. |
| `expo-audio` | Record voice prompts for transcription. | Current Expo docs position `expo-audio` as audio recording/playback package; avoid background recording initially. | Adds audio native module and microphone permission config. | Android `RECORD_AUDIO`; iOS microphone usage prompt. | Text input remains primary. |
| `@react-native-voice/voice` | Alternative on-device speech recognition. | Higher native risk; may require custom config and device speech services. | Adds native voice-recognition dependency. | Microphone and platform speech recognition prompts as applicable. | Use server-side transcription or text input. |
| `expo-document-picker` | Medibot file attachments. | iCloud support requires iOS capability/entitlement decisions; basic system picker is lower risk. | Adds document picker native module/config plugin. | Usually no broad Android storage permission for system picker; iCloud is entitlement-sensitive. | Keep text paste path; reject unsupported file types. |
| `expo-calendar` | Calendar event write/read integration. | Use write-only/system UI first; full read is more sensitive. | Adds calendar native module and permission config. | Android calendar read/write if direct access; iOS calendar usage descriptions. | Let users manually add appointments or keep in-app appointment cards. |
| `multer` or `busboy` | Backend multipart uploads for images, audio, documents. | Backend-only; no Expo concern. | Backend deployment dependency and memory/disk limits. | None on device. | Reject uploads and continue text/manual flows. |

## 12. Required Permission Matrix

| Feature | Android permissions | iOS permissions/usage descriptions | First-version recommendation |
| --- | --- | --- | --- |
| Food Scan camera | `CAMERA` | `NSCameraUsageDescription`; `NSPhotoLibraryUsageDescription` for library access. | Request only when user taps scan. |
| Food Scan image library | Prefer system picker without broad storage permission. | Photo library usage if required by picker path. | Prefer picker flow with minimal access. |
| Medibot voice input | `RECORD_AUDIO` | `NSMicrophoneUsageDescription` | Foreground short recordings only. |
| Medibot attachments | None for basic document picker; image attachments may need image permissions. | iCloud entitlement only if iCloud document access is enabled. | Limit file types and avoid broad file access. |
| Local reminders | Android 13+ notification permission; `RECEIVE_BOOT_COMPLETED` auto via package; avoid `SCHEDULE_EXACT_ALARM` initially. | Notification authorization prompt. | Use inexact local reminders first. |
| Calendar write | `WRITE_CALENDAR` if direct write; none if only system UI. | Calendar write-only/full access usage descriptions. | Prefer system UI or write-only first. |
| Calendar read | `READ_CALENDAR` | Full calendar access usage description. | Defer until later; do not request in first calendar pass. |

## 13. Backend/AI Requirements

Current AI/backend state:

- Frontend `AIRequest` is text-only.
- Backend `/ai/message` validates text-only message, prompt, conversation, context, and trace ID.
- Backend OpenAI proxy uses chat completions with text prompts and medical RAG governance.
- OpenAI key remains backend-only, which is the right pattern for future media/transcription work.

Required future changes:

- Add separate endpoints for media tasks instead of overloading `/ai/message`:
  - `POST /ai/transcribe` for voice input.
  - `POST /nutrition/food-scan` or `POST /ai/vision/meal` for Food Scan.
  - `POST /ai/attachments/analyze` for attachment summaries.
- Add request size limits, content-type validation, timeout limits, and structured output schemas.
- Extend observability with media task metadata: size, MIME type, duration, success/failure, provider latency, and trace ID.
- Keep raw media out of audit logs.
- Keep user confirmation before saving AI-derived meals or sending attachment-derived content to Medibot.
- Add AI safety rules for nutrition estimates, lab/prescription uploads, and medication documents.

OpenAI provider planning notes:

- Vision-capable models can analyze images, but Food Scan must remain estimate-based and user-confirmed.
- Speech-to-text should run through a backend endpoint so API keys stay off-device.
- File inputs may be useful for attachments, but broad document analysis should be delayed until file type policy and retention policy are written.

## 14. Privacy/Security Considerations

- Permission prompts must be contextual and user-initiated.
- Denied permissions must not block existing beta features.
- Notification text should avoid exposing medication names or sensitive health details by default.
- Raw photos, audio, and documents should not be persisted by default.
- Backend media endpoints need strict size limits and MIME sniffing.
- Uploads should be authenticated and rate-limited.
- AI-derived health data must be editable and clearly labeled as estimated.
- Medibot must continue to avoid diagnosis, treatment decisions, emergency guidance beyond urgent-care routing, and medication changes.
- Data export/reset needs future expansion if advanced features persist local reminder preferences, scan drafts, transcripts, or attachment summaries.

## 15. Testing And QA Plan

General validation:

- `npm run typecheck`
- `npm run backend:build`
- `npm.cmd run build:android:rc:local`
- `aapt dump badging android/app/build/outputs/apk/release/app-release.apk`
- Real-device install and smoke test after every package/permission change.

Feature-specific QA:

- Notifications: allow/deny prompt, channel creation, schedule/cancel/reschedule, tap navigation, reboot behavior, quiet hours, privacy copy.
- Food Scan: camera/library permissions, capture/select/cancel, low-confidence result, edit before save, offline/timeout fallback, large image rejection.
- Voice: microphone allow/deny, record/cancel/retry, transcript edit, background interruption, local file cleanup.
- Attachments: file type/size rejection, cancel, upload timeout, cache cleanup, safe response for medical files.
- Calendar: system UI/write-only/full-access paths, event duplication, timezone, denied permission fallback.

Release validation after native changes:

- Confirm new APK still includes `armeabi-v7a`, `arm64-v8a`, `x86`, and `x86_64`.
- Confirm only intended new permissions appear in badging.
- Install on at least one physical Android ARM device.
- Re-test Medibot text response and core tab launches.

## 16. Recommended Implementation Order

1. Phase 5A: planning/docs, no packages or permissions.
2. Phase 5B: local notification reminders for existing medication, habit, hydration, and sleep flows.
3. Phase 5C: Food Scan foundation with camera/library selection, backend schema, image limits, and manual confirmation.
4. Phase 5D: advanced Medibot input, starting with voice transcription; attachments only after file policy is ready.
5. Phase 5E: calendar/device integrations, starting with write-only or system calendar UI.

Reasoning:

- Notifications are valuable, self-contained, and build on current local stores.
- Food Scan needs camera/media and AI schema changes, but it maps cleanly to existing meal logging.
- Voice input should wait until microphone privacy and transcription endpoint design are ready.
- Attachments and calendar read access are the broadest privacy surfaces and should not be rushed.

## 17. P0/P1/P2 Risk Table

| Priority | Risk | Affected feature | Mitigation |
| --- | --- | --- | --- |
| P0 | Adding permissions/packages breaks Android release build or reintroduces real-device incompatibility. | All native additions | Add one package at a time, inspect APK badging/ABIs, install on real phone. |
| P0 | Raw media or documents are stored or logged unintentionally. | Food Scan, Voice, Attachments | Default no raw retention; audit metadata only; cache cleanup; backend logging review. |
| P0 | Medibot gives diagnosis, medication changes, or overconfident interpretation from scans/files. | Food Scan, Attachments | Extend safety guard prompts and output schemas; require disclaimers and user confirmation. |
| P1 | Notification text exposes sensitive medication or health details on lock screen. | Reminders | Privacy-safe default copy and optional detailed notification setting. |
| P1 | Calendar read permission exposes unrelated personal events. | Calendar | Start with system UI/write-only event creation; defer read sync. |
| P1 | Food Scan inaccurate estimates become trusted as facts. | Food Scan | Confidence scoring, editable review, "estimate only" copy, manual save. |
| P1 | Voice recording continues unexpectedly. | Voice | Foreground-only recording, clear state, cancel on unmount/background, duration cap. |
| P2 | Universal APK size increases further after native packages. | All native additions | Track size per package and validate tester download path. |
| P2 | Permission denial creates dead ends. | All permissioned features | Preserve manual/text/in-app fallback for every feature. |
| P2 | iOS permission requirements diverge from Android planning. | iOS future | Keep iOS usage strings and entitlement notes in implementation checklists. |

## 18. Decision: What Should Be Implemented First?

Implement Phase 5B local notification reminders first.

Reasons:

- It directly improves existing Schedule and Nutrition workflows.
- It does not require backend or AI architecture changes.
- It can be designed with permission-denied fallback.
- It can reuse current local habit, medication, hydration, and sleep data.
- It gives the team a controlled first package/permission validation pass after the Android ABI hotfix.

First implementation should avoid exact alarms, remote push, backend token registration, calendar access, and medical-detail lock-screen copy.

## 19. Recommended Next Phase

Recommended next phase: Phase 5B Smart Local Reminders & Notification Permission Implementation.

Phase 5B should:

- Add `expo-notifications` only after approval.
- Add a small reminder preference model.
- Schedule local notifications for existing medication, habit, hydration, and sleep reminder templates.
- Preserve current local logging and manual workflows if notification permission is denied.
- Build a new Android RC APK, inspect permissions/ABIs, install on a real Android phone, and smoke test Schedule, Nutrition, Profile, and Medibot.

## Reference Links Checked

- Expo Notifications: https://docs.expo.dev/versions/latest/sdk/notifications/
- Expo ImagePicker: https://docs.expo.dev/versions/latest/sdk/imagepicker/
- Expo Audio: https://docs.expo.dev/versions/latest/sdk/audio/
- Expo DocumentPicker: https://docs.expo.dev/versions/latest/sdk/document-picker/
- Expo Calendar: https://docs.expo.dev/versions/latest/sdk/calendar/
- OpenAI Images and Vision: https://developers.openai.com/api/docs/guides/images-vision
- OpenAI Speech to Text: https://developers.openai.com/api/docs/guides/speech-to-text
- OpenAI File Inputs: https://developers.openai.com/api/docs/guides/file-inputs

Package versions should be selected with `npx expo install` during implementation because this repo is currently on Expo SDK 56 while latest documentation may show newer recommended versions.

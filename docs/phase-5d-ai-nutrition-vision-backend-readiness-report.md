# Phase 5D AI Nutrition Vision Backend Readiness Report

## 1. Executive summary

Phase 5D adds a beta-safe backend readiness path for future AI-assisted food photo analysis. The app now has an authenticated backend endpoint, strict image validation, OpenAI vision-provider integration guarded by backend-only configuration, a typed nutrition draft schema, and an explicit Food Scan "Analyze with AI" action.

The implementation does not auto-save AI estimates. All returned nutrition values are draft-only and must be reviewed, edited, and saved manually by the user.

QA fix update: real-device QA on Mi phone found that manual Food Scan logging opened the meal modal, but the "Analyze with AI" action was not visible inside that modal. The UI now carries the selected Food Scan photo into the meal modal and shows a visible secondary "Analyze with AI" button directly below the modal header, above the scrollable meal form.

Final runtime QA update: the QA-fix APK passed manual runtime QA on Mi phone. The "Analyze with AI" action was visible in the alert/modal, the unavailable-backend fallback worked safely, manual logging still worked after fallback, and no P0/P1 blockers remain.

## 2. Scope

Completed scope:

- Backend route for food image analysis readiness.
- Raw image upload validation for JPEG, PNG, and WebP.
- Conservative 3 MB image size limit.
- Backend-only OpenAI provider call when configured.
- Safe 503 fallback when `OPENAI_API_KEY` is not configured.
- Typed nutrition draft response contract.
- Frontend API client foundation for binary image upload.
- Explicit Food Scan "Analyze with AI" UI action.
- Existing Log Manually path preserved.

Out of scope:

- Voice STT.
- Medibot attachment analysis.
- Automatic meal saving.
- AI medical or nutrition accuracy claims.
- Cloud image storage.
- Custom medication/habit setup or edit flows.

## 3. Current roadmap position

Phase 5D follows:

- Phase 5A: Advanced Feature Technical Planning.
- Phase 5B: Smart Local Reminders and Notifications.
- Phase 5C: Advanced Input and Device Integration Foundations.

Phase 5C real-device QA passed on Mi phone. Phase 5D prepares the backend and API contract needed for a future production-grade AI nutrition vision workflow.

## 4. Backend endpoint design

Endpoint added:

- `POST /ai/nutrition/analyze-image`

Route behavior:

- Requires existing backend auth middleware.
- Accepts raw binary image request body.
- Uses `Content-Type` to validate image MIME type.
- Does not persist uploaded images.
- Does not log image bytes, base64 data, or meal photo content.
- Returns the existing API envelope shape: `{ "data": ... }`.

Raw binary upload was selected for this phase to avoid adding multipart parsing dependencies and to keep the readiness path focused.

## 5. Image validation and privacy rules

Validation rules:

- Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`.
- Max size: 3 MB.
- Missing image returns sanitized `400 missing_image`.
- Unsupported type returns sanitized `400 unsupported_image_type`.
- Oversized payloads return sanitized `413 payload_too_large` or `400 image_too_large`, depending on where the request is rejected.

Privacy rules:

- Images are not stored long-term.
- Raw image data is not logged.
- Base64 image data is not logged.
- The app uploads only after the user explicitly taps "Analyze with AI".

## 6. OpenAI/vision configuration behavior

OpenAI integration is backend-only and follows the OpenAI Responses API image-input pattern and structured output guidance.

Configured behavior:

- If `OPENAI_API_KEY` is missing, the endpoint returns `503 ai_food_analysis_unavailable`.
- Mobile displays: "AI food analysis is not available in this build. Please log manually."
- If configured, the backend sends the image to OpenAI with a structured JSON schema request.
- The prompt asks for rough estimates only, avoids medical advice, and requires uncertainty and review warnings.
- If the provider fails or returns invalid JSON, the backend returns a sanitized failure response and the app keeps manual logging available.

The model comes from existing `OPENAI_MODEL`; deployments must choose a vision-capable model for this endpoint.

## 7. Nutrition draft response schema

The backend contract returns a draft:

```json
{
  "analysisId": "local/generated id or provider id",
  "title": "Estimated meal",
  "items": [
    {
      "name": "string",
      "confidence": 0.0,
      "estimatedCalories": null,
      "protein": null,
      "carbs": null,
      "fat": null,
      "notes": "string"
    }
  ],
  "totals": {
    "calories": null,
    "protein": null,
    "carbs": null,
    "fat": null
  },
  "confidence": 0.0,
  "warnings": [
    "AI estimates can be inaccurate. Review before saving."
  ],
  "requiresReview": true
}
```

Rules enforced:

- `requiresReview` is always `true`.
- Confidence values are constrained to `0..1`.
- Nutrition values may be `null` when uncertain.
- Response is validated before returning to the app.

## 8. Frontend/API integration

Added frontend API support:

- `ApiClient.postBinary(...)` for authenticated binary uploads.
- `analyzeFoodImageDraft(...)` in `src/services/api/AIApi.ts`.
- Client-side validation mirrors backend allowed types and 3 MB limit.
- Handles 400 validation errors, 503 unavailable responses, network errors, and timeouts.

The mobile app does not call OpenAI directly.

## 9. Nutrition UI behavior

Food Scan now shows AI analysis in two visible places after image capture/selection:

- Photo-captured alert: `Log Manually` and `Analyze with AI`.
- Food Scan preview card: `Log Manually` and `Analyze with AI`.
- Photo-sourced Log Meal modal: secondary `Analyze with AI` button below the modal header and above the scrollable form.

UI safety behavior:

- Analysis only happens after explicit user confirmation.
- The confirmation explains that the photo is uploaded to the backend and will not save automatically.
- Successful draft analysis opens the existing meal modal with editable title, calories, macros, and notes.
- The user must manually save the meal.
- Missing OpenAI configuration, missing/staging route, auth failure, 404, 503, or network failure shows the beta-safe fallback message and preserves manual logging.

## 10. Manual review and safety decisions

Safety decisions:

- No automatic nutrition-store writes.
- No medical advice.
- No accuracy guarantees.
- No hidden image upload.
- No permanent image storage.
- Warnings and uncertainty are part of the response contract.

## 11. Backend validation

Backend validation completed:

- `npm.cmd run backend:build`: passed.
- Temporary local backend smoke server on port `4510`: passed.
- `/health`: `ok`.
- `/status`: `openAIConfigured=false`.
- Unauthenticated image route: `401`.
- Missing image with auth: `400`.
- Unsupported content type with auth: `400`.
- Missing OpenAI key fallback with auth: `503`.

Smoke validation used tiny synthetic bytes only; no real meal photos were sent.

## 12. Mobile validation

Static/mobile validation completed:

- `npx.cmd tsc --noEmit`: passed.
- `npm.cmd run typecheck`: passed.
- `git diff --check`: passed with Git LF/CRLF normalization warnings only.
- `npm.cmd run build:android:rc:local`: passed after allowing Gradle wrapper download.

## 13. Release APK details

APK:

- Path: `android/app/build/outputs/apk/release/app-release.apk`
- SHA256: `A5305FDF2662AE9C4944EE7ED3A783E521032F352A3A2798E00B0373377B2515`
- Native ABIs: `arm64-v8a`, `x86_64`

Relevant permissions present:

- `android.permission.INTERNET`
- `android.permission.CAMERA`
- `android.permission.READ_CALENDAR`
- `android.permission.WRITE_CALENDAR`
- `android.permission.POST_NOTIFICATIONS`

`RECORD_AUDIO` was not present in the APK badging output.

## 14. Runtime QA status

Runtime QA completed manually on Mi phone for APK SHA256 `A5305FDF2662AE9C4944EE7ED3A783E521032F352A3A2798E00B0373377B2515`.

Final runtime QA result:

- APK installed successfully: Yes.
- App opened: Yes.
- Crash: No.
- Food Scan photo select/capture worked: Yes.
- `LOG MANUALLY` opened meal modal: Yes.
- `Analyze with AI` button visible in alert/modal: Yes.
- `Analyze with AI` fallback worked: Yes.
- Manual logging still worked after fallback: Yes.
- Medibot typed message worked: Yes.
- Attachment foundation worked: Yes.
- Voice deferred message worked: Yes.
- Reminders still worked: Yes.
- Calendar safe behavior worked: Yes.

Phase 5D passed runtime QA on Mi phone.

## 15. Issues found

Issues found during validation:

- Initial Android build attempt failed because the sandbox blocked Gradle wrapper download.
- Real-device QA found that the "Analyze with AI" action was not visible after `LOG MANUALLY` opened the photo meal modal.

The missing `Analyze with AI` visibility issue was fixed and passed runtime retest on Mi phone. No P0/P1 blockers remain.

## 16. Fixes made

Fixes and additions:

- Added authenticated nutrition image analysis endpoint.
- Added nutrition vision service with OpenAI configured/unconfigured behavior.
- Added strict backend nutrition draft schema.
- Added sanitized oversized-payload error handling.
- Added binary upload support to frontend API client.
- Added explicit Food Scan "Analyze with AI" action.
- Preserved manual Food Scan logging behavior.
- Added photo-sourced meal modal state and a visible modal-level `Analyze with AI` button.
- Added `Analyze with AI` to the photo-captured alert.
- Normalized unavailable/auth/route/network failures to the beta-safe fallback copy.

## 17. Remaining limitations

Intentional beta-safe limitations:

- AI estimates remain draft-only.
- AI food recognition is not guaranteed accurate.
- No auto-save.
- No cloud image storage.
- No attachment upload/analysis.
- Voice STT remains deferred.
- Custom medication/habit setup and edit remain after beta.
- Calendar may safely fail if no writable calendar exists.
- Live AI food recognition depends on the deployed backend route and OpenAI configuration. When unavailable, the fallback works safely and manual logging remains available.

## 18. P0/P1/P2 risk table

| Risk | Level | Status | Notes |
| --- | --- | --- | --- |
| Hidden image upload | P0 | Mitigated | Upload only occurs after explicit Analyze confirmation. |
| Auto-saving AI nutrition guesses | P0 | Mitigated | Analysis opens editable modal only. |
| Raw image data logged | P0 | Mitigated | Route and smoke validation avoid raw image logging. |
| Missing OpenAI key crash | P1 | Mitigated | Endpoint returns 503 fallback. |
| Unsupported/oversized image crash | P1 | Mitigated | Sanitized 400/413 responses. |
| Analyze with AI not visible in modal | P1 | Fixed and passed | Real-device Mi phone retest confirmed visibility in alert/modal. |
| Runtime device regression | P2 | Passed | Mi phone runtime QA passed with no crash. |

## 19. Decision: Is Phase 5D ready to close?

Phase 5D can close.

The QA-fix APK passed manual runtime QA on Mi phone. No P0/P1 blockers remain. The remaining limitation is that live AI food recognition depends on a deployed backend route and OpenAI configuration; when unavailable, the fallback works safely.

## 20. Recommended next phase

Recommended Phase 5E:

- Staging backend test with a vision-capable OpenAI model.
- Review UX for edited draft confidence/warnings.
- Add automated backend route tests around image validation and missing-key behavior.

# Phase 4C-7 Quick Actions and Assistant Input Hardening Report

## 1. Executive summary

Phase 4C-7 hardens high-priority visible quick actions and Assistant input controls so beta users do not hit generic placeholder dead ends. Unavailable features now use clear beta-safe messaging, while AI-oriented actions route to Medibot with useful prefilled prompts.

No camera, voice capture, file upload, backend, auth, or AI provider architecture was added or changed.

## 2. Scope

- Nutrition quick actions: Scan Food and AI Meal Plan.
- Fitness quick actions: Start Workout, Log Exercise, and AI Fitness Coach.
- Medibot input controls: attachment and voice buttons.
- Medibot Voice Assistant card copy.
- Minimal type-safe Assistant prompt navigation support.

## 3. Placeholder actions found

Known core placeholders found:

- Nutrition `Scan Food`: generic later-workflow alert.
- Nutrition `AI Meal Plan`: generic later-workflow alert.
- Fitness `Start Workout`: generic choose-workout alert with limited guidance.
- Fitness `Log Exercise`: generic choose-workout alert with limited guidance.
- Fitness `AI Fitness Coach`: generic later-workflow alert.
- Assistant attachment input: workspace/file attachment unavailable wording.
- Assistant voice input: voice capture not enabled wording.
- Assistant voice card: workspace wording and an Enable Alert button that implied unavailable behavior.

Deferred unrelated placeholders were left alone unless they were part of these core beta flows.

## 4. Nutrition quick action hardening

`Scan Food` now shows a beta-safe message explaining that photo-based food scanning is coming after beta and offers a direct `Log Meal` action that opens the existing manual meal form.

`AI Meal Plan` now routes to Medibot with a prefilled prompt:

`Create a simple meal plan for today based on my nutrition goals and today's logged meals. Keep it practical and wellness-focused.`

Existing Log Meal and hydration quick actions remain unchanged.

## 5. Fitness quick action hardening

`Start Workout` now focuses the user on the existing workout card flow and explains that they can complete a workout card after finishing. It explicitly avoids claiming a live timer exists.

`Log Exercise` now points users to the visible workout cards and the Phase 4C-3 local completion flow.

`AI Fitness Coach` now routes to Medibot with a prefilled prompt:

`Act as my wellness fitness coach. Suggest a safe workout plan based on my recent activity and completed workouts. Keep it practical and avoid medical claims.`

Existing workout completion and undo behavior remain unchanged.

## 6. Assistant input hardening

Attachment input now says attachments are coming after beta and instructs users to type or paste text into Medibot.

Voice input now says voice input is coming after beta and instructs users to type their message. No microphone permission or voice capture is requested.

The Voice Assistant card now says voice mode is coming after beta and uses `Learn More` instead of `Enable Alert`.

## 7. Navigation/prompt approach

Added a small optional `initialPrompt` param to the existing `Chat` tab route. Assistant reads this param and preloads the Medibot input draft.

This keeps navigation changes narrow and avoids adding new screens, providers, or prompt orchestration.

## 8. Files changed

- `src/types/index.ts`
- `src/screens/Nutrition/NutritionScreen.tsx`
- `src/screens/Fitness/FitnessScreen.tsx`
- `src/screens/Assistant/AssistantScreen.tsx`
- `src/components/chat/VoiceAssistantCard.tsx`
- `docs/phase-4c-7-quick-actions-assistant-input-hardening-report.md`

## 9. Validation commands run

- `npx.cmd tsc --noEmit` - passed
- `npm.cmd run typecheck` - passed
- `git diff --check` - passed with existing CRLF normalization warnings only
- `npm.cmd run build:android:rc:local` - passed

## 10. Runtime QA result

Passed on `emulator-5554` with the release APK.

- Installed/reused `android/app/build/outputs/apk/release/app-release.apk`.
- Created an authenticated throwaway QA session through the app UI.
- Nutrition:
  - `Scan Food` showed `Food scan coming after beta` with clear beta-safe copy.
  - The `Log Meal` action from that alert opened the existing manual meal form.
  - `AI Meal Plan` navigated to Medibot and prefilled the meal-planning prompt.
  - Existing Log Meal UI remained available.
- Fitness:
  - `Start Workout` showed the new workout-card guidance and did not claim a live timer.
  - `Log Exercise` showed the new local workout-completion guidance.
  - `AI Fitness Coach` navigated to Medibot and prefilled the fitness-coaching prompt.
  - Existing workout completion still worked: completing `Warmup` updated progress to `1 of 3`, showed `Undo`, and added the item to `Completed Today`.
- Medibot:
  - Attachment input showed `Attachments coming after beta` with type/paste guidance.
  - Voice input showed `Voice input coming after beta` with type-message guidance.
  - No file picker, upload, microphone capture, or permission prompt appeared.
  - Normal text input/send remained stable: a typed message was accepted, the input cleared, and the Medibot screen stayed online without crash. UIAutomator did not expose a fresh response node in the visible viewport, so this pass does not make a stronger fresh-response claim.
- Regression:
  - Cross-tab navigation through Data, Nutrition, Fitness, Schedule, Profile, and Chat did not crash.
  - App-specific logcat scan for `FATAL EXCEPTION`, `ANR`, `TypeError`, `ReferenceError`, and `AndroidRuntime` returned no Healthy You app-process matches. Broader logcat contained `AndroidRuntime` entries from the `uiautomator` helper process only, not from `com.healthyyou.app`.

## 11. Known limitations

- Food photo scanning remains deferred until a real camera/scanning workflow is implemented and validated.
- File attachments remain deferred until upload, storage, privacy, and UI handling are implemented.
- Voice input remains deferred until microphone permissions and speech-to-text are implemented and validated.
- Start Workout still uses the existing workout completion cards rather than a live timer.

## 12. Follow-up items

- Add a real camera-based food scanner only after permissions, privacy copy, and result review UX are ready.
- Add attachment upload only after storage/privacy/backend handling is defined.
- Add voice input only after speech-to-text and permission UX are validated.
- Consider clearing the Assistant `initialPrompt` route param after prompt adoption if repeated prefill becomes noisy.
- Add automated tests for quick-action routing and Assistant prompt prefill.

## 13. Recommended next Phase 4C subphase

Recommended next subphase: Phase 4C-8 beta release hardening. Focus on final runtime sweeps, visible placeholder audits across secondary flows, and store/reset/report consistency before the next alpha tag.

# Phase 5G — Voice Input / Speech-to-Text Foundation

## Summary

Phase 5G establishes a safe voice input foundation for Medibot without enabling runtime speech-to-text yet. The current app does not include a validated local/device STT dependency or secure transcription endpoint, so this phase keeps voice input deferred, improves the user-facing fallback, and preserves typed Medibot chat and Phase 5F attachment analysis behavior.

No recording, audio upload, transcript generation, or automatic message sending is enabled in this build.

## Starting checkpoint

- Last committed tag: v0.33.0-alpha
- Phase 5F is implemented locally but runtime QA is deferred
- Phase 5G is built on top of Phase 5F WIP

## Scope

- Audit existing voice input foundation.
- Avoid adding an unverified native STT package.
- Keep microphone permission absent because real voice capture is not implemented.
- Improve voice button fallback copy.
- Preserve Medibot typed chat.
- Preserve Phase 5F attachment analysis flow.
- Record completed combined Android runtime QA.

Out of scope:

- Real microphone capture.
- Local/device speech recognition.
- Audio upload to a transcription provider.
- Background recording.
- Automatic transcript send.
- Diagnosis or medical advice behavior.

## Implementation decision

STT deferred with reason:

- The project currently has no validated speech-to-text dependency.
- Adding a native STT package without device QA would risk build/runtime instability.
- No secure transcription endpoint exists for audio upload.
- The safest foundation is to keep the voice button present, show a clear unavailable fallback, and avoid adding microphone permission until real STT is implemented and tested.

## Frontend behavior

- voice button: remains available in the Medibot input bar.
- permission request: no permission request is made because STT is deferred.
- listening state: not entered for unavailable voice input.
- transcript behavior: no transcript is generated in this build.
- fallback behavior: tapping the voice button shows `Voice input is not available in this build. You can continue typing your message.`
- typed chat preserved: users can continue typing and manually sending Medibot messages.

## Permissions

- RECORD_AUDIO added: No
- Reason: real voice capture and STT are not implemented in this build.

## Privacy and safety

- no background recording
- no hidden upload
- no automatic send
- no audio persistence
- user reviews typed text before sending
- permission denied fallback is not needed because microphone permission is not requested
- typed chat preserved

## Regression coverage

- Phase 5F attachment flow preserved
- Food Scan preserved
- reminders preserved
- calendar preserved

## Validation

- `npm.cmd run backend:build`: passed after applying the requested Node helper PATH.
- `npx.cmd tsc --noEmit`: passed after applying the requested Node helper PATH.
- `npm.cmd run typecheck`: passed after applying the requested Node helper PATH.
- `git diff --check`: passed with expected LF-to-CRLF warnings only.
- `npm.cmd run build:android:rc:local`: passed after allowing Gradle wrapper network access.
- APK SHA256: `5F18A32D245F7A0FDDE1201DC18EA21F06EDB9EEC366F9EA9BE6519579AB459B`
- ABI verification: `native-code: 'arm64-v8a' 'x86_64'`
- SDK verification: `sdkVersion:'26'`, `targetSdkVersion:'35'`
- Permission verification: `CAMERA`, `READ_CALENDAR`, `WRITE_CALENDAR`, and `POST_NOTIFICATIONS` present.
- RECORD_AUDIO absent: passed because STT is deferred.

## Runtime QA checklist

RC2 Mi phone runtime QA passed with user confirmation:

- install successful: Yes
- app opened: Yes
- crash: No
- voice deferred dialog works: Yes
- no microphone permission prompt: Yes
- Medibot attachment flow still works: Yes
- Food Scan fallback still works: Yes
- existing reminders still work: Yes
- Add Reminder quick action opens new routine flow: Yes
- old "coming after beta" Add Reminder message removed: Yes
- enable custom reminder works: Yes
- reschedule custom reminder works: Yes
- disable custom reminder works: Yes
- Profile clear-all reminders turns custom toggles off: Yes
- notification text privacy-safe: implementation verified; not manually checked in notification shade
- logcat fatal errors: not checked because ADB/logcat was unavailable, but no visible crash occurred

Voice STT remains deferred safely. Voice deferred button behavior passed because the safe unavailable dialog appeared, no microphone permission prompt appeared, and no recording started.

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

- `src/screens/Assistant/AssistantScreen.tsx`
- `src/services/media/voiceInputFoundation.ts`
- `docs/phase-5f-medibot-attachment-analysis-foundation-report.md`
- `docs/phase-5g-voice-input-speech-to-text-foundation-report.md`

## Next phase

Phase 5H — Custom Health Routines

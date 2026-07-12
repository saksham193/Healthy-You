# Phase 8D - Voice Input/STT Runtime

## Summary

Phase 8D RC1 implemented the first Medibot voice input runtime and backend STT foundation. Android QA found a P0 launch blocker: the RC1 APK installed but the app did not open when tapping the icon, even after uninstall/reinstall.

RC2 prioritized app launch safety. Android QA passed after the risky native mobile recording path was removed. The backend STT route, mock STT provider, and smoke coverage remain in place, while mobile real recording is temporarily degraded to a safe fallback so no native audio module can crash app startup.

## Starting checkpoint

- commit: ab72fb4bf46a7440e812c02f2e146f4cca35daeb
- tag: v0.46.0-alpha

## Scope

- voice input runtime foundation
- backend STT route
- mock STT provider
- safe mobile voice fallback for RC2
- Android RC build
- no automatic transcript send
- no background recording
- no production deployment

## Existing voice audit

- fallback state: Phase 8D-0 only showed a no-recording fallback.
- Medibot voice button: microphone button existed in the input bar and opened safety copy only.
- permissions: `RECORD_AUDIO` was absent before Phase 8D.
- RC1 package change: `expo-av` was added for recording, then RC2 removed it after the launch blocker.
- backend AI route architecture: existing raw media routes, AI-sensitive rate limiting, request IDs, and privacy-safe logging were reused.

## RC1 Android QA finding

- install successful
- app did not open from launcher
- crash/blocker persisted after uninstall and reinstall
- severity: P0 launch blocker

## RC2 Android QA result

- install successful: Yes
- app opens: Yes
- crash on launch: No
- Medibot opens: Yes
- voice button opens safe voice UI/fallback: Yes
- `RECORD_AUDIO` permission prompt appears: No
- no microphone permission requested: Yes
- no audio recording occurs: Yes
- no audio upload occurs: Yes
- no transcript auto-send occurs: Yes
- no unrelated permission prompts: Yes
- attachment analysis still works: Yes
- typed Medibot chat preserved: Yes
- Cloud Sync manual-only behavior preserved: Yes
- no auto-sync on screen open: Yes

QA screenshots showed the safe voice dialog copy, the voice fallback card in conversation history, and attachment analysis still working with analyzed status retained.

## Root cause

The blocker was isolated to the new Phase 8D mobile native audio path. RC1 imported the native `expo-av` audio module through `voiceRecordingService.ts`, which was imported by `AssistantScreen.tsx` at module load time. Because the app failed before opening and all backend/TypeScript validation passed, RC2 treats this native audio startup path as unsafe for this release candidate.

## RC2 fix

- removed `expo-av` from `package.json` and `package-lock.json`
- removed `RECORD_AUDIO` from tracked app config because real recording is paused in RC2
- replaced native recording calls with a same-interface safe fallback service
- changed the voice button flow to show fallback copy without requesting microphone permission
- kept backend `/ai/voice/transcribe` and mock STT smoke tests for the provider foundation
- kept no background recording, no automatic upload, and no automatic transcript send

## Implementation

- backend STT provider architecture: `backend/src/ai/stt` adds provider types, mock provider, and provider factory.
- voice transcribe route: `POST /ai/voice/transcribe` accepts bounded raw audio and returns a safe transcript response.
- smoke script: `scripts/smoke-ai-voice.js` validates mock transcription, unsupported MIME, oversized payloads, duration limits, auth, request IDs, and secret-safe responses.
- env config: `.env.example` and backend validation define `STT_PROVIDER=mock`, `STT_FALLBACK_PROVIDER=mock`, max bytes, max duration, and timeout.
- mobile RC2 fallback: `voiceRecordingService.ts` no longer imports native audio and returns a safe unavailable state.

## Runtime behavior

- app launch: RC2 is built to avoid loading native audio on startup.
- voice button: opens safe voice fallback.
- permission prompt: not applicable in RC2 because real recording is paused.
- recording start/stop: deferred to a later RC after launch is stable.
- transcribe: mobile audio upload is paused in RC2; backend STT route remains validated by smoke tests.
- typed Medibot chat: preserved.
- attachment analysis: preserved.
- provider unavailable fallback: mock STT returns a clear demo transcript in backend smoke tests.

## STT provider policy

- mock provider: default, no external calls, no paid API, and clearly labeled demo transcript.
- Vosk future option: preferred free/local option for a later phase.
- whisper.cpp future option: possible local backend option for later.
- OpenAI Whisper optional future paid provider: reserved but not implemented in RC2.

## Privacy and safety

- no microphone permission request in RC2.
- no background recording.
- no automatic upload.
- no automatic send.
- no audio/transcript logging.
- no diagnosis/treatment claims.
- no API keys in the mobile app.
- voice fallback copy states that Healthy You will not record audio, upload audio, or send transcripts automatically.

## Android permission result

- `RECORD_AUDIO`: removed in RC2 because real recording is paused.
- ABI: `arm64-v8a`, `x86_64`.
- existing permissions remain: `CAMERA`, `READ_CALENDAR`, `WRITE_CALENDAR`, storage with `maxSdkVersion=32`, and `POST_NOTIFICATIONS`.
- no unrelated new dangerous permissions were found in the APK badging check.

## Validation

- backend build: passed
- TypeScript: passed
- typecheck: passed
- AI provider smoke: passed
- attachment smoke: passed
- voice smoke: passed
- Android RC build: passed
- APK hash: `8CA162A5D58E61B98A7B50EAADC9A2CF2447878F9AE082EC6BB23F2B3419B78C`
- ABI/permission verification: passed; `RECORD_AUDIO` absent in RC2
- diff check: passed with normal CRLF warnings only

## Android QA APK

- source APK path: `android/app/build/outputs/apk/release/app-release.apk`
- copied QA APK path: `C:/Users/SAKSHAM GUPTA/Desktop/healthy-you-apk-feedback/HealthyYou-Phase8D-Voice-STT-RC2-QA.apk`
- SHA256: `8CA162A5D58E61B98A7B50EAADC9A2CF2447878F9AE082EC6BB23F2B3419B78C`
- ABI: `arm64-v8a`, `x86_64`
- permission result: `RECORD_AUDIO` absent; no unrelated new dangerous permissions found

## Manual Android QA checklist

Install successful: Yes
App opens: Yes
Crash on launch: No

Medibot opens: Yes
Typed chat still works: Yes
Voice button opens safe voice UI/fallback: Yes
RECORD_AUDIO permission prompt appears only after voice action: Not applicable; no microphone permission is requested in RC2
Deny permission fallback safe: Not applicable
Recording starts only after user action: Not applicable; recording is paused in RC2
Recording stops: Not applicable
Cancel/delete works: Not applicable
Transcribe requires explicit tap: Not applicable
Transcript review appears: Not applicable
Transcript is not auto-sent: Yes

Attachment analysis still works: Yes
Cloud Sync still manual-only: Yes
No auto-sync on screen open: Yes
No unrelated permission prompts: Yes

## Deferred

- stable mobile recording path
- `RECORD_AUDIO` reintroduction when recording is stable
- Vosk integration
- whisper.cpp integration
- OpenAI Whisper provider
- advanced voice commands
- background/always-listening intentionally not planned

## Result

Passed RC2 Android QA. No P0/P1 blockers remain. Phase 8D can close as backend STT foundation, mock provider, API route, smoke coverage, and safe mobile voice fallback. Real native recording remains deferred to a later stabilization phase.

## Files changed

- `README.md`
- `package.json`
- `backend/.env.example`
- `backend/src/config/EnvValidator.ts`
- `backend/src/controllers/AIVoiceController.ts`
- `backend/src/routes/aiRoutes.ts`
- `backend/src/middleware/requestHardening.ts`
- `backend/src/ai/stt/STTProvider.ts`
- `backend/src/ai/stt/MockSTTProvider.ts`
- `backend/src/ai/stt/STTProviderFactory.ts`
- `backend/src/types/contracts.ts`
- `scripts/smoke-ai-voice.js`
- `src/screens/Assistant/AssistantScreen.tsx`
- `src/components/chat/VoiceAssistantCard.tsx`
- `src/services/api/AIApi.ts`
- `src/services/media/voiceInputFoundation.ts`
- `src/services/media/voiceRecordingService.ts`
- `docs/phase-8d-voice-stt-runtime-report.md`

## Next phase

Phase 8E - AI Screen Integrations and Health Context RAG.

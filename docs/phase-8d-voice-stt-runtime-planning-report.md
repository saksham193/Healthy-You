# Phase 8D-0 — Voice/STT Runtime Planning and Architecture Readiness

## Summary

Phase 8D-0 documents the future voice/STT runtime architecture without changing mobile runtime behavior. Real voice implementation is deferred to Phase 8D, because voice requires Android permission changes, recording UX, audio handling, and device QA.

## Starting checkpoint

- committed checkpoint: v0.45.0-alpha
- commit: 1d543fdbe410e1abdf29b3622fc9a0da6cfbcd6d
- Phase 8C RC3 passed Android QA and can close

## Scope

- planning only
- no runtime code changes
- no `RECORD_AUDIO` permission
- no microphone recording
- no audio upload

## Current voice state

- fallback-only
- no microphone permission
- no recording
- no transcript
- no audio upload

## Why implementation is deferred

- Phase 8C closure is handled separately from this planning-only report.
- Voice requires Android permission/runtime QA.
- Stacking another mobile runtime change before attachment QA is risky.
- Real STT needs consent, short clip limits, transcript review, backend provider handling, and failure-mode testing.

## STT provider comparison

- Vosk: open-source and offline; a good student-project option with no API cost, but may increase app size and requires native integration work.
- whisper.cpp: open-source local Whisper runtime; can run on a backend or laptop with better quality than many offline options, but is compute-heavy for mobile/server environments.
- Ollama: useful for text LLM responses, but it is not an STT engine and should not be treated as voice transcription.
- OpenAI Whisper API: high-quality hosted transcription, but paid and should remain an optional future provider only.
- Hosted Google/Gemini voice options: provider-dependent and useful later, but not the primary free/offline path.
- Browser/Web Speech API: not reliable enough for React Native Android production.

Recommended student-friendly path:

- Phase 8D-1: keep fallback, add permission/consent design.
- Phase 8D-2: implement recording UI safely.
- Phase 8D-3: add backend STT provider abstraction.
- Phase 8D-4: use Vosk or whisper.cpp for free testing.
- Phase 8D-5: keep OpenAI/Gemini optional future providers.

## Proposed architecture

- Mobile Medibot voice button remains explicit.
- User sees consent and Android permission disclosure before recording.
- App records only a short bounded clip.
- User can cancel/delete the clip before upload.
- User explicitly confirms sending audio to backend.
- Backend route `/ai/voice/transcribe` receives the bounded audio clip.
- STT provider abstraction selects local/free provider first.
- Backend returns transcript only, not an AI answer.
- User reviews and edits transcript in the app.
- User taps send to Medibot.
- Existing `/ai/chat` handles the final text message.

## Privacy and safety plan

- explicit consent
- `RECORD_AUDIO` disclosure
- no background recording
- no always-listening mode
- no automatic upload
- no automatic transcript submission
- no audio logging
- no prompt/transcript logging
- no diagnosis/treatment claims
- no emergency triage replacement
- no secrets in status, errors, logs, or reports

## Future implementation roadmap

- Phase 8D-1 Permission and consent UX
- Phase 8D-2 Recording UI and local clip handling
- Phase 8D-3 Backend STT provider abstraction
- Phase 8D-4 Free provider integration
- Phase 8D-5 Android QA closure

## QA checklist for future Phase 8D

- permission prompt
- deny permission behavior
- recording start/stop
- cancel/delete recording
- transcript review
- no automatic send
- fallback when STT unavailable
- `RECORD_AUDIO` present only when implemented

## Result

Planning complete. No runtime implementation was added. No `RECORD_AUDIO` permission was added. Real voice/STT implementation remains deferred to Phase 8D.

## Files changed

- `README.md`
- `docs/phase-8d-voice-stt-runtime-planning-report.md`

## Next phase

Phase 8D — Voice Input/STT Runtime.

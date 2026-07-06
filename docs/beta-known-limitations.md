# Healthy You Closed Beta Known Limitations

This document lists expected limitations for the closed beta. These items are intentionally deferred unless a supported beta flow crashes, blocks login, loses data unexpectedly, or exposes unsafe behavior.

## Deferred Features

- Food Scan is deferred.
- Voice input is deferred.
- Attachments are deferred.
- Notifications and reminder delivery are deferred.
- Calendar integration is deferred.
- Backend account deletion is beta-deferred.

## AI And Medibot

- Live OpenAI validation is deferred while staging reports `openAIConfigured=false`.
- Medibot text chat should remain beta-safe through local/offline fallback behavior.
- Do not use Medibot for diagnosis, treatment, emergencies, or medication decisions.

## Local-Only Wellness Data

The following Phase 4C wellness data is local-only unless otherwise cloud-backed in a later phase:

- Nutrition meals.
- Hydration logs.
- Fitness workout completions.
- Schedule habit completions.
- Medication taken/skipped logs.

Local wellness reset clears local wellness logs on the device. It does not delete the account.

## Backend And Account Limitations

- Account registration and login use the staging backend.
- Some profile, memory, and health summary sync paths are cloud-backed.
- Backend account deletion is not available in this beta.
- Render persistent disk configuration should be monitored during beta.
- Full production monitoring is still upcoming.

## Production Readiness Limitations

- Closed beta uses staging infrastructure.
- Production backend rollout is not complete.
- Production API host remains future work.
- Live OpenAI provider behavior is not production-validated.

## Safety Limitations

- Healthy You is not for medical diagnosis.
- Healthy You is not for emergency use.
- Healthy You is not a substitute for a clinician.
- Do not rely on the app for urgent symptoms, medication decisions, or treatment decisions.

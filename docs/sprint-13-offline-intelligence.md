# Sprint 13 Offline Intelligence

## Architecture

Online flow remains: Medibot message -> HealthSafetyGuard -> health context -> configured AI provider/backend proxy -> cloud response -> memory save -> response cache.

Offline flow adds: Medibot message -> HealthSafetyGuard -> local health context -> offline intent classifier -> rules engine -> recommendation engine -> curated knowledge/cache -> safe local response -> offline memory queue.

## Offline Capabilities

- Detects web online/offline status with a native-safe fallback.
- Answers hydration, sleep, nutrition, fitness, medication, device status, trend, general health, and emergency-like messages with deterministic local rules.
- Uses saved profile, memory, trends, and device-source metadata from the existing AI context.
- Reuses small cached AI response summaries for similar non-emergency topics.
- Queues memory sync records locally when offline or when remote memory save fails.

## Offline Limitations

- No local LLM is bundled.
- No heavy medical model or medical dataset is bundled.
- Offline responses are short, rule-based wellness guidance.
- Stale, cached, fallback, or unavailable device data lowers confidence.
- Reconnecting is recommended for cloud AI, fresh device sync, and backend memory/profile sync.

## Safety Behavior

- HealthSafetyGuard still runs before any provider.
- Offline emergency-like intent never diagnoses and directs the user to urgent local medical help.
- Medication guidance avoids dosage changes and directs missed-dose questions to the prescription label, doctor, or pharmacist.
- Cached response storage skips emergency and highly sensitive topics.
- Offline provider labels responses as offline and marks backend failure responses as fallback.

## Test Scenarios

Run:

```bash
node scripts/validate-offline-intelligence.js
```

The script validates offline hydration, sleep, nutrition, fitness, stale device data, emergency escalation, simulated provider fallback, and cached response lookup without internet.

## Future Local LLM Pack Strategy

Future optional packs should stay opt-in, separately downloadable, and safety-gated behind the same HealthSafetyGuard and offline rules. The current Sprint 13 layer should remain the default fallback even if a future local model is unavailable, expired, or disabled.

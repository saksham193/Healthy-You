# Sprint 13.1 Offline Intelligence Hardening

## Audit Findings

- `HealthSafetyGuard` still runs before context creation and provider selection in `aiService`.
- Online provider flow is still preferred when connectivity is online.
- `OfflineAIProvider` activates when connectivity is offline or when the configured provider throws.
- Fallback metadata is added only after provider failure.
- Chat UI labels offline messages only when `metadata.offline` is true, and adds `cached` only when cached guidance was used.
- Emergency and urgent safety responses are excluded from response caching.
- Memory queue deduplicates by stable memory id and now tracks attempts.

## Connectivity Decision

Sprint 13.1 adds `@react-native-community/netinfo` through `expo install`, which selected SDK 56 compatible version `12.0.1`.

Why it was added:

- It closes the native airplane-mode gap without a heavy dependency.
- It is Expo/EAS compatible when installed through Expo.
- It improves proactive native offline detection.
- Web behavior remains browser-based through `navigator.onLine` and online/offline events.
- Native module errors are caught so the prior fallback behavior remains safe.

## Privacy And Cache Rules

`CachedAIResponseStore` now avoids caching:

- emergency intent
- urgent safety responses
- mock provider output
- diagnosis/cancer-sensitive prompts
- medication dosage/change requests
- mental health crisis content
- reproductive or sexual health sensitive queries
- authentication/session/token/API-key content

Cache bounds:

- max 40 entries for the active local/user scope
- max 120 global entries
- max age 14 days
- newest entries are kept; oldest entries are evicted

## Memory Queue Rules

`OfflineMemoryQueue` now:

- deduplicates by memory id
- keeps timestamp and source
- tracks retry attempts and last attempt time
- keeps failed flushes queued
- removes corrupted queue JSON safely
- caps queue size at 50 items
- flushes when connectivity returns

## Confidence Scoring

Offline metadata now distinguishes:

- `high`: known intent plus recent local/live context and meaningful rules
- `medium`: known intent with stale or limited context
- `low`: unknown intent, no relevant local data, or cached-only weak context
- emergency handling uses `safetyLevel: "urgent"` and does not rely on confidence as the safety signal

## Safety Rules

Validated safety regressions include:

- chest pain
- breathing difficulty
- fainting
- stroke-like symptoms
- medication dose change request
- emergency while offline
- diagnosis request

Expected behavior:

- no diagnosis
- no medication dose changes
- urgent escalation for emergency-like symptoms
- offline limitation remains visible

## Validation Scenarios

Run:

```bash
node scripts/validate-offline-intelligence.js
```

The script validates:

- explicit offline mode
- repeated offline messages
- hydration, sleep, fitness, nutrition, medication, device, and general offline quality prompts
- confidence scoring
- safety regressions
- cached response lookup
- cache privacy exclusions
- cache TTL and max-entry eviction
- simulated backend failure fallback metadata
- memory queue dedupe, failed flush retention, reconnect flush, and corrupted queue recovery

## Remaining Risks

- Real iOS and Android airplane-mode behavior still needs device validation.
- NetInfo native module availability depends on the installed dev/prod build including the native package.
- Existing npm audit findings remain outside Sprint 13.1 scope.

## Future Local LLM Pack Notes

Future optional local LLM packs should remain opt-in and separately downloadable. They should sit behind `HealthSafetyGuard`, keep the deterministic offline rules as a safety fallback, avoid emergency/diagnosis/dosage behavior, and use the same cache and memory privacy constraints.

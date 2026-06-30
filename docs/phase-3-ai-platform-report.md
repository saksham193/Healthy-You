# Phase 3 AI Platform Report

Generated for Phase 3H release-candidate validation.

## Architecture

Healthy You Phase 3 AI is a local-first wellness intelligence stack. The chat path builds a compact `AIContext`, applies the medical safety guard before provider selection, answers direct device metric questions locally when possible, and routes richer requests through mock/cloud/offline providers plus multi-agent coordination.

Core modules:

- Personalization: coaching style, motivation style, learned preferences, response length, explanation layer.
- Trend intelligence: weekly trends, drift detection, confidence, data quality.
- Predictive intelligence: wellness predictions and preventive actions, not diagnosis.
- Goal and habit coaching: active goals, at-risk habits, streaks, progress, next action.
- AI insights: ranked insights with supporting signals, explanations, and safety level.
- Daily briefing: concise focus, top insight, up to three actions, data source note.
- Recommendation decision: primary recommendation, alternatives, suppressed candidates, ranking reason, duplicate merge.
- Prevention: wellness risk awareness summary with no diagnosis or medication dosage advice.
- Offline AI: local rules, cached responses, offline recommendations, safety escalation.
- Multi-agent routing: nutrition, fitness, sleep, and medication specialists coordinated by a health coordinator.

## Integration Boundaries

The prompt includes compact summaries only. It does not include raw Health Connect records, full memory history, full prediction lists, or full preventive risk lists.

Direct metrics use synced or cached context without provider calls. Cloud profile sync, memory sync, and health-summary sync run in the background and do not block AI response generation.

## Safety Boundaries

Medibot remains a wellness assistant. It must not diagnose disease, claim medical certainty, prescribe medication, recommend dosage changes, or replace professional care. Emergency symptoms, self-harm, medication dosage requests, and diagnosis requests are blocked or escalated by the safety guard before AI provider routing.

Preventive wellness language is limited to behavioral patterns such as sleep debt, hydration decline, recovery strain, activity drift, habit relapse, and device data quality. It must not say the user has dehydration, burnout, chronic fatigue, diabetes, heart disease, anxiety, or depression.

## Conflict And Duplicate Controls

Recommendation decision normalizes common wellness action variants so equivalent actions merge into one candidate with supporting sources. Unsafe medication, unsafe exercise escalation, low-confidence trend candidates, repeated hydration actions, and stale device candidates are suppressed when appropriate.

Phase 3H tightened emergency matching for overdose wording and improved hydration action normalization.

## Performance Notes

Validated budgets:

- Direct metric path: under 2 seconds.
- Offline provider path: under 5 seconds.
- Cloud provider fallback: bounded by configured timeout.
- Context prompt: compact summaries only, under regression prompt budget.
- Memory and cloud sync: background-only from chat response path.
- Health Connect full sync: not triggered on every chat send.

Observed Phase 3H local validation timings:

- Direct metric response: 34 ms.
- Mock/provider non-direct response with background memory failure: 15 ms.
- Configured cloud timeout fallback path: 71 ms with a 50 ms test timeout.
- Urgent safety response: 1 ms.
- AI regression suite: 78 scenarios in 38-40 ms.
- Expo web bundle: 1423 ms in final export run.

## Validation Summary

The Phase 3H matrix includes TypeScript, backend build, Expo web export, all Phase 3 validators, backend sync/auth validators, extra device/RAG/observability/quality validators, and the new `validate-ai-regression-suite.js` with 78 synthetic local scenarios.

Phase 3H validation result: passed on June 30, 2026.

Passed commands:

- `npm install`
- `npx tsc --noEmit`
- `npm run backend:build`
- `npx expo export --platform web`
- `node scripts/validate-preventive-health.js`
- `node scripts/validate-recommendation-decision.js`
- `node scripts/validate-daily-health-briefing.js`
- `node scripts/validate-ai-insights.js`
- `node scripts/validate-goal-habit-coaching.js`
- `node scripts/validate-trend-intelligence.js`
- `node scripts/validate-personalization-engine.js`
- `node scripts/validate-ai-health-routing.js`
- `node scripts/validate-offline-intelligence.js`
- `node scripts/validate-ai-latency.js`
- `node scripts/validate-predictive-health.js`
- `node scripts/validate-multi-agent.js`
- `node scripts/validate-auth-flow.js`
- `node scripts/validate-cloud-profile-sync.js`
- `node scripts/validate-memory-sync.js`
- `node scripts/validate-health-summary-sync.js`
- `node scripts/validate-ai-regression-suite.js`
- `node scripts/validate-device-layer.js`
- `node scripts/validate-medical-rag.js`
- `node scripts/validate-medical-rag-hardening.js`
- `node scripts/validate-observability.js`
- `node scripts/validate-ai-quality.js`

## Known Limitations

- Live OpenAI checks are skipped when `OPENAI_API_KEY` is absent.
- Local machine has multiple Node runtimes. Expo export requires Node `>=20.19.4`; backend SQLite validation requires a Node runtime compatible with the installed `better-sqlite3` native binding.
- Web export validates bundling, not an Android native build. EAS build was intentionally not run.

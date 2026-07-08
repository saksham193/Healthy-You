# Healthy You

Healthy You is a React Native and Expo health companion focused on wellness tracking, Health Connect synchronization, offline-first AI guidance, and medically safe conversational support.

This checkpoint contains the completed Phase 3 AI Platform through `v0.13.0-alpha`, including personalization, trend intelligence, predictive wellness, goal and habit coaching, AI insights, daily briefing, recommendation decisioning, preventive wellness intelligence, offline AI, and the full AI regression suite.

## Features

- Health dashboard with nutrition, fitness, sleep, schedule, profile, and device data.
- Android Health Connect integration for local health summaries.
- Cloud profile, memory, and health-summary sync with offline queues.
- Secure authentication with token storage via SecureStore.
- Medibot AI assistant with direct metric answers and safe wellness guidance.
- Offline AI mode with local rules, cache, and safety handling.
- Medical safety guard for emergency, self-harm, diagnosis, and medication dosage prompts.
- Multi-agent routing for nutrition, fitness, sleep, and medication topics.

## AI Architecture

The AI platform builds a compact local `AIContext` from profile, memory, Health Connect summaries, trends, predictions, coaching, insights, briefing, recommendations, and preventive wellness summary.

Major AI modules:

- Personalized Intelligence
- Trend Intelligence
- Predictive Health Signals
- Goal and Habit Coaching
- AI Insight Generation
- Daily Health Briefing
- Recommendation Decision Orchestrator
- Preventive Wellness Intelligence
- Offline AI Provider
- Multi-Agent Health Routing
- Medical Safety Guard

The prompt intentionally includes only compact summaries. It does not include raw Health Connect dumps, full memory history, or stored credentials.

## Screenshots

Screenshots will be added during Android release-candidate testing.

## Installation

```bash
npm install
```

## Backend Setup

Copy the backend environment template and configure local values:

```bash
cp backend/.env.example backend/.env.development
```

Run backend type build:

```bash
npm run backend:build
```

Local backend data and SQLite files are ignored by Git.

## Health Connect Setup

For Android testing:

1. Install Health Connect.
2. Grant Healthy You the required read permissions.
3. Ensure a compatible fitness app writes recent data.
4. Use the in-app sync flow to refresh local summaries.

Healthy You stores aggregate health summaries only. It does not commit raw high-frequency Health Connect records.

## Development Commands

```bash
npm start
npm run backend:build
npm run typecheck
npx expo export --platform web
```

Do not run EAS builds unless explicitly approved for a release candidate.

## Validation Commands

```bash
npx tsc --noEmit
npm run backend:build
npx expo export --platform web

node scripts/validate-ai-regression-suite.js
node scripts/validate-preventive-health.js
node scripts/validate-recommendation-decision.js
node scripts/validate-daily-health-briefing.js
node scripts/validate-ai-insights.js
node scripts/validate-goal-habit-coaching.js
node scripts/validate-trend-intelligence.js
node scripts/validate-personalization-engine.js
node scripts/validate-ai-health-routing.js
node scripts/validate-offline-intelligence.js
node scripts/validate-ai-latency.js
node scripts/validate-predictive-health.js
node scripts/validate-multi-agent.js
node scripts/validate-auth-flow.js
node scripts/validate-cloud-profile-sync.js
node scripts/validate-memory-sync.js
node scripts/validate-health-summary-sync.js
node scripts/validate-device-layer.js
node scripts/validate-medical-rag.js
node scripts/validate-medical-rag-hardening.js
node scripts/validate-observability.js
node scripts/validate-ai-quality.js
```

## Roadmap

- Phase 5A advanced feature technical planning and permission readiness.
- Phase 5B smart local reminders and notification permission implementation.
- Phase 5C Food Scan foundation with camera/photo selection and user-confirmed meal logging.
- Phase 5D advanced Medibot input planning for voice transcription and safe attachments.
- Phase 5E calendar/device integrations after reminder and media permission flows are stable.

## Tech Stack

- Expo
- React Native
- TypeScript
- Zustand
- Express
- SQLite via better-sqlite3
- Health Connect
- OpenAI-compatible provider abstraction

## Security And Privacy

- Local env files are ignored.
- Tokens are stored through SecureStore.
- AsyncStorage queues must not contain credentials.
- Generated builds, caches, node modules, backend data, and SQLite files are ignored.
- AI safety guard blocks diagnosis, medication dosage, emergency, and self-harm requests.

## Contributors

- Saksham Gupta
- Codex-assisted engineering

## License

See [LICENSE](./LICENSE).

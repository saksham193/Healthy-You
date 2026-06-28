# Sprint 18 Predictive Health Engine

## Audit Report

Healthy You already had the data needed for lightweight prediction:

- `src/services/ai/trends` generates 7-day trends for sleep, water, steps, calories, medication adherence, and weight.
- `src/store/healthStore.ts` exposes current health scores, hydration, steps, activity, sleep, medication schedule, device source, and last sync time.
- `src/services/device` exposes sync freshness, cached/fallback sources, permissions, heart rate, sleep, hydration, steps, and calories.
- `src/services/local-ai` already contains offline health rules for hydration, sleep, activity, medication, recovery, and stale data.
- `src/services/agents` can consume compact prediction context through the shared agent context and orchestrator metadata.
- `backend/src/evaluation` has deterministic benchmark patterns that Sprint 18 extends with `PredictionBenchmark`.

Predictions plug into `healthContextBuilder.ts` after the existing AI context is built, then flow into `promptBuilder.ts`, agent orchestration metadata, offline provider metadata, and backend observability.

## Architecture

The prediction engine lives in `src/services/prediction`.

- `PredictionTypes.ts` defines prediction categories, risk levels, confidence, horizons, signals, explanations, preventive actions, results, and summaries.
- `PredictiveSignalEngine.ts` extracts explainable signals from trends, device data, memory, profile, medication adherence, and device freshness.
- `RiskScoringEngine.ts` converts signals into category scores, risk levels, confidence, and data quality.
- `PredictionOrchestrator.ts` runs predictors, deduplicates actions, sorts by risk/confidence/horizon/data quality, and returns top predictions.
- `PreventiveInsightGenerator.ts` converts predictions into safe, user-friendly insight summaries.

The engine is local, deterministic, offline-capable, and does not use heavy ML dependencies.

## Prediction Categories

- Sleep
- Hydration
- Recovery strain
- Medication adherence
- Activity
- Nutrition consistency
- Device data quality

## Safety Policy

Predictions are wellness trend signals only. They must not:

- diagnose disease or sleep disorders
- predict emergencies with certainty
- prescribe treatment
- change medication dose, timing, or medication instructions
- use fear-based wording
- claim medical certainty

Every prediction carries a safety note and low-risk preventive actions.

## Confidence Logic

Confidence is based on signal repetition and data quality:

- Repeated signals with fresh data can reach high confidence.
- Stale or limited data caps confidence.
- Unavailable data returns low confidence.
- A single metric cannot produce high risk by itself unless reinforced by repeated/contextual signals.

## Data Quality Handling

Data quality is derived from device source and sync age:

- `fresh`: live device context
- `stale`: cached data or older sync
- `limited`: fallback/demo-like data
- `unavailable`: no usable device source

Stale or unavailable data lowers confidence and produces device-data preventive actions.

## AI Context Integration

`AIContext` now includes `predictions`. The prompt includes only the top three compact prediction summaries:

- category
- risk level
- confidence
- horizon
- brief explanation

The prompt also reminds Medibot that predictions are wellness trends, not diagnosis, certainty, or treatment instructions.

## Agent Integration

The Health Orchestrator attaches prediction metrics to response metadata and merges the top preventive prediction actions into unified Medibot suggestions. Agents continue to use shared context only and do not store prediction data separately.

## UI Integration

No UI redesign or navigation changes were made. Predictive insights are exposed through Medibot context and response suggestions/metadata. A dashboard section can be added later using the existing insight component style if desired.

## Observability And Evaluation

Backend observability now supports aggregate prediction metrics:

- `predictionCount`
- `highRiskPredictionCount`
- `predictionCategories`
- `averagePredictionConfidence`
- `dataQualityIssues`

`backend/src/evaluation/PredictionBenchmark.ts` validates coverage, risk scoring, safety wording, and confidence behavior. `scripts/validate-predictive-health.js` validates synthetic cases without OpenAI.

## Limitations

- Predictions are short-term wellness forecasts, not medical predictions.
- There is no diagnosis, emergency prediction, or treatment recommendation.
- Weather is currently represented only as a placeholder consideration in hydration logic; no weather service is used.
- Data quality depends on device sync availability and current app state.
- Future ML should remain explainable, local-first where possible, and governed by the same safety policy.

## Future ML Path

Future versions may introduce lightweight on-device statistical models after enough consented, privacy-preserving history exists. Any ML path should preserve explanations, confidence labels, safety guardrails, and deterministic fallback rules.

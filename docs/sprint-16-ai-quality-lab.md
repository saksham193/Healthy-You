# Sprint 16: Continuous Evaluation + AI Quality Lab

## Architecture

Sprint 16 adds a backend-only quality lab above the Sprint 15 observability layer.

Flow:

1. Synthetic golden scenarios define expected safety, retrieval, offline, cache, and citation signals.
2. `BenchmarkEngine` runs scenarios through deterministic provider paths: online, RAG, and offline.
3. `RegressionDetector` compares benchmark summaries across versions.
4. `QualityGateEngine` decides whether release gates pass, warn, or block.
5. `RAGBenchmark` and `OfflineBenchmark` measure specialized subsystem health.
6. `ReleaseReadinessEngine` converts quality signals into a 0-100 release score.
7. `ScorecardGenerator` emits JSON scorecards for AI, provider, RAG, and offline readiness.

No UI was added. No model training or LLM judging is used.

## Privacy Policy

The quality lab does not store user prompts, assistant responses, tokens, auth data, or medical history.

Allowed data:

- Synthetic scenario IDs
- Provider names
- Scores
- Pass/fail counts
- Gate status
- Version labels
- Aggregated benchmark history

The golden dataset is curated test content, not user data.

## Benchmark Design

`GoldenDataset.ts` contains 50 curated scenarios across:

- Hydration
- Sleep
- Nutrition
- Fitness
- Medication adherence
- Device health data
- Offline behavior
- Urgent escalation
- Retrieval
- General wellness

Each scenario includes:

- Expected metadata signals
- Required answer qualities
- Unsafe content to avoid
- Minimum score
- Offline support flag

The benchmark evaluates deterministic signals such as safety level, citation presence, grounding, confidence, cache use, fallback use, and latency.

## Gate Thresholds

Quality gates:

- Safety: blocks below strict threshold
- Grounding: warns or blocks if retrieved/local grounding drops
- Citation: checks RAG citation discipline
- Latency: catches slow response regressions
- Evaluation: checks overall deterministic quality
- Offline: checks offline usefulness and safety

Urgent safety failures always block release.

## Release Process

Recommended process:

1. Run `node scripts/validate-ai-quality.js`.
2. Run TypeScript and export validation.
3. Compare current benchmark summary against the latest accepted baseline.
4. Review regression findings and blocked gates.
5. Use release readiness:
   - `Not Ready`: fix blocked gates
   - `Beta`: limited validation only
   - `Release Candidate`: final review recommended
   - `Production Ready`: acceptable for normal release review

## Quality Policy

The lab must remain deterministic and privacy-preserving.

Do not add:

- LLM judges
- Raw prompt storage
- Raw response storage
- User medical record ingestion
- Automatic deployment

Future quality changes should improve benchmarks, gates, source governance, or metadata fidelity without weakening medical safety.

## Future Evaluation Strategy

Planned extensions:

- Persist benchmark summaries in backend SQLite when production storage is enabled.
- Add clinician-reviewed golden scenarios.
- Add per-release baseline snapshots.
- Add CI gate integration.
- Add vector retrieval benchmarks once vector retrieval is introduced.
- Add manual reviewer notes linked only to scenario IDs.

# Sprint 15 Observability And Evaluation

## Architecture

Sprint 15 adds privacy-preserving observability around Healthy You AI flows. Metrics capture request timing, provider mode, RAG usage, retrieval confidence, safety level, cache/fallback flags, device-context presence, memory presence, and deterministic evaluation scores.

No UI is added. No analytics SDK is added.

## Privacy Policy

The observability layer must not store:

- raw prompts
- full responses
- auth tokens
- secrets
- raw health details
- personal identifiers

Allowed fields are metadata only: lengths, intent, timings, flags, categories, trace ids, versions, and scores.

Default privacy level is `minimal`.

## Retention

The in-memory evaluation store keeps up to 1000 metrics and 1000 audit events with a 30-day retention window. Expired records are hidden from reports.

## Evaluation Logic

The deterministic evaluator scores:

- quality
- grounding
- citations
- safety
- latency
- confidence

No LLM judge is used.

## Trace Flow

Mobile creates a request `traceId`. The backend preserves it, creates provider/retrieval/memory-style ids where needed, and returns trace metadata in the AI response. Audit logs store only trace ids and metadata.

## Reporting

`QualityReporter` returns JSON with request counts, provider split, offline percentage, RAG percentage, average latency, quality, grounding, citation coverage, cache rate, fallback rate, and safety rate.

## Future Dashboard Ideas

- Backend-only JSON endpoint for quality reports
- Alerting on safety override spikes
- Retrieval confidence trend charts
- Citation coverage over time
- Offline fallback and reconnect success trend

## Validation

Run:

```bash
node scripts/validate-observability.js
```

The script validates telemetry, deterministic evaluation, trace IDs, privacy constraints, safety metrics, prompt versions, audit logs, reporting, experiment defaults, and retention.

# Sprint 14.1 Medical RAG Hardening

## Architecture

Sprint 14.1 adds governance around the Sprint 14 backend RAG layer. The backend now validates source quality, excludes expired or deprecated documents, ranks citations by source tier and quality, scores retrieval with multiple dimensions, checks model output grounding, and attaches governance metadata.

## Source Governance

Sources are tiered:

- `tier_1`: WHO, CDC, NHS, MedlinePlus
- `tier_2`: major nonprofit or professional association
- `tier_3`: internal curated content
- `unsupported`: unknown or unapproved sources

Each source has review status, production approval, review frequency, and risk level.

## Review Workflow

Knowledge documents now include version, review status, reviewer, reviewed date, expiry date, quality score, supersession metadata, and deprecation state. Expired, deprecated, unsupported, and low-quality documents are excluded from production retrieval.

## Citation Policy

The citation manager deduplicates, ranks, caps, and hides weak citations. Ranking prefers tier 1, approved/recent, high-quality source material. Citation metadata stays concise and does not expose long source text.

## Quality Scoring

Quality scoring considers source tier, review status, lifecycle metadata, content word limits, safety level, and deprecation. Production threshold is currently 70.

## Grounding Strategy

The grounding guard flags unsupported certainty, diagnosis language, medication certainty, low retrieval confidence, and weak overlap with retrieved knowledge. Response governance can downgrade unsupported answers and attaches grounding metadata.

## Limitations

- Retrieval is still deterministic and lightweight.
- The knowledge seed remains intentionally small.
- Live OpenAI validation is skipped by the offline-safe validation script unless a separate manual live test is performed.
- Governance improves safety, but clinician review is still needed before expanding higher-risk topics.

## Future Vector DB Path

The current chunk and retrieval result types include enough metadata for future vector search. A future vector DB should preserve source governance, quality score, expiry/deprecation filtering, citation ranking, and grounding checks.

## Future Clinician Review Process

Future clinician workflow should add reviewer identity, role, approval notes, version diff, re-review reminders, and separate approvals for high-risk categories.

## Validation

Run:

```bash
node scripts/validate-medical-rag-hardening.js
```

The script validates source governance, document validation, expired/deprecated exclusion, citation ranking, retrieval confidence, hallucination/grounding flags, response governance, quality reporting, and optional OpenAI skip behavior.

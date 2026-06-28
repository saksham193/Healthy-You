# Medical Knowledge Expansion Policy

## Allowed Topics

- General wellness education
- Hydration, sleep, nutrition, exercise, and medication adherence routines
- Device health data limitations
- Emergency red flag education
- Preventive health and when to seek professional care
- General chronic condition support without treatment decisions

## Disallowed Topics

- Diagnosis or disease confirmation
- Treatment plans for a specific person
- Medication dosing, stopping, changing, or mixing advice
- Emergency triage beyond urgent escalation
- Scraped or unlicensed copyrighted medical content
- User medical record ingestion into the knowledge base
- Unsupported source material

## Review Process

1. Draft a concise source-backed document.
2. Assign category, tags, safety level, source metadata, version, expiry, and review owner.
3. Run `node scripts/validate-medical-rag-hardening.js`.
4. Require approval before production retrieval.
5. Re-review before `expiresAt`.

## Approval Path

Tier 1 public health sources may be approved by the Healthy You knowledge governance owner. Tier 2 association content should receive additional review. Tier 3 internal content must remain draft unless reviewed and approved through a clinician-ready process.

## Retirement Process

Deprecated, expired, unsupported, or low-quality documents are excluded from retrieval. Superseded documents should set `isDeprecated: true` and point the new document at the prior version through `supersedes`.

## Future Clinician Workflow

Higher-risk expansions, including chronic condition education, medication support, pregnancy, mental health, and symptom interpretation, should require clinician review metadata before production approval.

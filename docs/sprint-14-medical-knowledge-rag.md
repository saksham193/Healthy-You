# Sprint 14 Medical Knowledge Layer And RAG Backend

## Architecture

Sprint 14 keeps the mobile app lightweight. Mobile still sends the existing Medibot request to the backend AI proxy. The backend now classifies safety, retrieves small curated medical knowledge chunks, builds a RAG-enhanced prompt, calls OpenAI, applies safety post-processing, and returns citation/safety metadata.

Flow:

Mobile Medibot -> `aiService` -> `HealthSafetyGuard` -> `OpenAIProvider` -> Backend AI Proxy -> Medical Safety Classifier -> Medical Knowledge Retriever -> RAG Prompt Builder -> OpenAI -> Medical Response Safety Guard -> Mobile response metadata.

## Safety Policy

- Do not diagnose or imply certainty.
- Do not prescribe medication.
- Do not recommend medication dose changes, stopping, or medication mixing.
- Urgent symptoms must include urgent local medical help guidance.
- Diagnosis-risk requests receive educational framing and clinician evaluation guidance.
- Safety post-processing can prepend safe fallback language when model output omits required safety boundaries.

## Knowledge Source Policy

The seed knowledge is concise, paraphrased, and curated. It avoids copied long-form medical content and avoids scraping. Source metadata uses trusted source names such as WHO, CDC, NHS, MedlinePlus, and American Heart Association. Specific URLs are omitted unless known and verified.

## Knowledge Categories

- hydration
- nutrition
- sleep
- exercise
- medication_adherence
- emergency_symptoms
- chronic_condition_general
- preventive_health
- device_health_data
- general_wellness

## Citation Strategy

Backend responses include optional metadata citations:

- title
- sourceName
- sourceUrl when available
- category

The mobile UI does not need to render citations in this sprint. The metadata is available for future UI work and audit logging.

## Limitations

- Retrieval is deterministic keyword/category scoring, not semantic vector search.
- The knowledge seed is intentionally small and general.
- RAG improves grounding but does not make Medibot a clinician.
- OpenAI still requires `OPENAI_API_KEY`; missing key keeps the existing 503 behavior so mobile fallback remains intact.

## Future Vector DB Plan

The in-memory `MedicalKnowledgeStore` exposes normalized chunks and category/tag/keyword search. A future vector database can replace or augment `searchRelevant` while preserving `MedicalKnowledgeChunk`, citation, and retrieval result types.

## Future Clinician-Reviewed Content Plan

Future content should use reviewed, versioned documents with:

- source metadata
- reviewer identity or review process
- reviewed date
- expiration/re-review date
- safety level
- category and tag taxonomy

Higher-risk categories such as chronic conditions, medication, pregnancy, and mental health should require clinician-reviewed content before expansion.

## Validation

Run:

```bash
node scripts/validate-medical-rag.js
```

The script validates retrieval categories, citation shape, safety classification, RAG prompt safety rules, safety post-processing, and seed content size limits without requiring an OpenAI key.

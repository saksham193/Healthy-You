# Sprint 17 Multi-Agent Health Intelligence

## Audit Report

Healthy You already had the core inputs needed for a coordinated agent layer.

- Intent exists in `src/services/ai/intentClassifier.ts`, `src/services/local-ai/OfflineIntentClassifier.ts`, and the Sprint 16 golden dataset.
- Context exists in `src/services/ai/healthContextBuilder.ts`, profile building, health trends, device sync state, and current health scores.
- Memory exists in `LongTermMemory`, `MemoryStore`, and the offline memory queue. Agents read this shared memory but do not persist to it.
- Recommendations exist in `RecommendationEngineV2` and `LocalRecommendationEngine`.
- Medical RAG, grounding, governance, telemetry, and evaluation exist on the backend under `backend/src/knowledge`, `backend/src/observability`, and `backend/src/evaluation`.
- Orchestration now sits after `HealthSafetyGuard` and health context construction, then enriches the provider response without changing Medibot UI or provider interfaces.

## Architecture

The agent system is implemented under `src/services/agents`.

- `AgentTypes.ts` defines the contracts for agents, context, decisions, recommendations, confidence, priority, and execution modes.
- `AgentContextBus.ts` creates immutable shared context snapshots from existing AI requests.
- `AgentSelectionEngine.ts` maps request intent and domain language to specialist agents.
- `AgentMemoryPolicy.ts` enforces shared-memory rules.
- `HealthOrchestrator.ts` routes, executes, coordinates, and attaches response metadata.
- `agents/HealthCoordinator.ts` merges outputs, deduplicates actions, resolves safety-sensitive conflicts, and aggregates confidence.

Agents are deterministic orchestration and reasoning layers. They are not separate LLMs, APIs, memory stores, or chat surfaces.

## Agent Rules

- Agents may read shared profile, memory, device, trend, recommendation, retrieval, safety, and evaluation context.
- Agents do not write memory.
- Agents do not persist data.
- Agents return concise `reasoningSummary` values only.
- Agents avoid diagnosis, medical diet prescriptions, dosage advice, and medical training advice.
- Final response remains one Medibot response.

## Specialist Agents

- `NutritionAgent` interprets nutrition status, hydration gaps, diet quality, allergies, and food preferences.
- `FitnessAgent` interprets steps, activity minutes, recovery context, heart/device data, and readiness.
- `SleepAgent` interprets sleep score, sleep duration, trend risk, routine consistency, and recovery context.
- `MedicationAgent` handles adherence, reminders, education, and timing awareness while avoiding dosage or medication changes.

## Orchestrator Flow

1. `aiService` runs `HealthSafetyGuard`.
2. `aiService` builds the existing health context, prompt, trace ID, memory, trends, insights, and recommendations.
3. The provider returns the normal Medibot response.
4. `HealthOrchestrator` selects and executes specialists.
5. `HealthCoordinator` merges top actions, citations, confidence, conflict counts, consensus, and latency.
6. The response keeps the provider text and receives merged suggestions plus backward-compatible metadata.

Emergency or unsafe requests are overridden with minimal safe guidance before specialist routing.

## Selection Policy

- Nutrition or hydration intent routes to `NutritionAgent`.
- Fitness intent routes to `FitnessAgent`.
- Sleep intent routes to `SleepAgent`.
- Medication intent routes to `MedicationAgent`.
- Multi-domain messages use `parallel` or `consensus`.
- Urgent language uses `sequential` safety override and no specialists.

## Shared Context

The context bus exposes existing data only:

- profile completeness and profile fields
- shared memory records
- device source and sync timestamp
- current health metrics
- trends
- personalized recommendations
- retrieval/safety placeholders where available

The bus does not duplicate storage or create a new memory system.

## Offline Behavior

Offline mode remains provider-compatible. `OfflineAIProvider` keeps local rules, cache, recommendations, and knowledge. The orchestrator then adds agent routing metadata and merged local agent actions. Nutrition, fitness, sleep, and medication agents are offline-capable and require no network.

## Evaluation

`backend/src/evaluation/AgentBenchmark.ts` provides deterministic checks for:

- routing
- confidence
- conflict handling
- safety
- offline behavior
- coordination

`scripts/validate-multi-agent.js` validates the frontend orchestrator and backend benchmark without an OpenAI key.

## Observability

Sprint 15 telemetry now supports aggregate agent metrics:

- agents used
- coordination mode
- agent latency
- selection frequency
- conflict rate
- consensus percent

No user message content is logged in agent metrics.

## Response Metadata

AI responses may now include:

- `agentsUsed`
- `orchestratorVersion`
- `coordinationMode`
- `agentConfidence`
- `agentLatency`
- `agentRoutingReason`
- `agentRiskLevel`
- `agentConflictCount`
- `agentConsensusPercent`
- `agentSummary`
- `agentRecommendations`

All fields are optional and backward compatible.

## Limitations

- Agents are deterministic and do not perform independent retrieval.
- Backend RAG remains the source of medical grounding for cloud responses.
- Live OpenAI checks remain optional and are not required for local validation.
- The coordinator recommends possible memory updates but does not persist them.

## Future Expansion

Future agents can be added by implementing `HealthAgent`, registering the agent in `HealthOrchestrator`, and updating the selection policy and benchmark scenarios.

# Phase 8A — AI Provider Runtime Architecture

## Summary

Phase 8A adds the backend AI provider runtime architecture needed to make Healthy You's main AI features functional in later Phase 8 work. The implementation provides a safe no-key mock provider, a local Ollama-compatible provider foundation, provider status metadata, a safe backend chat route, safety guarding, and smoke coverage.

## Starting checkpoint

- commit: cfd67b8b9aff936b2826b70ee085e984f7c473c1
- tag: v0.43.0-alpha

## Scope

- AI provider runtime architecture
- mock provider
- Ollama/local provider foundation
- provider status route
- chat route foundation
- safety guard
- no real voice/STT implementation
- no attachment upload expansion
- no new mobile permissions

## Existing AI audit

- existing frontend AI services: frontend has local/offline provider interfaces, mock/offline providers, prompt/context builders, Medibot orchestration, and local safety handling.
- existing backend AI routes: `/ai/message`, `/ai/nutrition/analyze-image`, and `/ai/assistant/analyze-attachment` already existed.
- nutrition vision route status: preserved; still uses bounded raw image parsing and requires auth.
- Medibot fallback status: frontend Medibot still has local fallback behavior; Phase 8A did not redesign UI or force mobile runtime changes.
- OpenAI config status: OpenAI key remains backend-only and optional unless the OpenAI provider is selected in production.
- safety guard status: frontend safety guard existed; Phase 8A adds backend chat safety guard for the new provider runtime.
- request hardening/rate limiting: Phase 7C middleware remains in place; `/ai/chat` uses the AI-sensitive limiter.

## Implementation

- provider interface: added backend `AIProvider` interface and shared AI runtime types.
- provider factory: added factory selection for configured provider and fallback provider.
- mock provider: added always-available safe demo provider for no-key testing.
- Ollama provider: added local Ollama-compatible provider using backend `OLLAMA_BASE_URL` and `OLLAMA_MODEL`.
- AI chat controller/route: added `POST /ai/chat`.
- provider status route: added `GET /ai/providers/status`.
- env config: added `AI_PROVIDER`, `AI_FALLBACK_PROVIDER`, `AI_SAFETY_GUARD_ENABLED`, `AI_PROVIDER_TIMEOUT_MS`, `OLLAMA_BASE_URL`, `OLLAMA_MODEL`, and placeholders for future hosted provider keys.
- smoke script: added `scripts/smoke-ai-provider.js` and `npm.cmd run backend:smoke:ai`.

## Provider policy

- mock: default provider and fallback provider; always available; no external network or API key required.
- ollama: first local/free real provider foundation; uses a backend-configured local Ollama-compatible endpoint and times out safely.
- future providers: `gemini`, `groq`, `openrouter`, `huggingface`, and `openai` are reserved in config but not fully implemented in Phase 8A.
- fallback behavior: unavailable primary providers fall back to the configured fallback provider, defaulting to mock.
- no paid API requirement: default smoke and runtime path work without OpenAI or hosted-provider keys.

## Safety policy

- health safety guard: backend guard screens the user message before provider calls and appends a general wellness safety notice to responses.
- no diagnosis/treatment claims: diagnostic, medication dosage, and prescription-change prompts are redirected safely.
- emergency redirection: emergency/self-harm style requests receive generic urgent-help guidance.
- medication/dosage boundaries: dosage and medication-change requests are not answered with instructions.
- privacy-safe prompt handling: prompt, health context, and provider response text are not logged.

## Privacy and security

- no prompt/response logging
- no API keys in mobile app
- backend env only
- no secrets in status
- no file/image/audio upload expansion
- no automatic sync
- no background sync
- no production deployment

## Validation

- `npm.cmd run backend:build`: passed after applying the documented Node PATH fallback
- `npx.cmd tsc --noEmit`: passed
- `npm.cmd run typecheck`: passed
- `npm.cmd run backend:migrate`: passed; 3 applied migrations and 0 pending
- `npm.cmd run backend:migrate:status`: passed; 3 applied migrations and 0 pending
- `npm.cmd run backend:smoke:migrations`: passed
- `npm.cmd run backend:smoke:sync`: passed
- `npm.cmd run backend:smoke:hardening`: passed
- `npm.cmd run backend:smoke:monitoring`: passed
- `npm.cmd run backend:smoke:backup`: passed
- `npm.cmd run backend:smoke:ai`: passed
- `git diff --check`: passed with CRLF normalization warnings only
- Android RC build: skipped because no frontend/mobile runtime code, native Android config, ABI config, or permissions changed

## Smoke results

- provider status: passed; `GET /ai/providers/status` returns mock provider metadata, fallback provider, safety guard state, and request ID
- mock chat: passed; `POST /ai/chat` works with `AI_PROVIDER=mock`
- fallback behavior: passed; unsafe medical dosage prompt receives a safety fallback response
- safety notice: passed; chat responses include the general wellness safety notice
- no key required: passed; smoke runs with no OpenAI key
- no secret exposure: passed; smoke checks status, chat, malformed, invalid, and rate-limit responses for sensitive terms

## Deferred to later Phase 8

- Phase 8B fully functional Medibot UI/runtime
- Phase 8C attachment analysis runtime
- Phase 8D voice/STT runtime
- Phase 8E AI screen integrations
- Phase 8F Android AI runtime QA

## Result

Pending review. Implementation and automated validation are complete; commit/tag/push have not been performed.

## Files changed

- `README.md`
- `backend/.env.example`
- `backend/src/ai/providers/AIProvider.ts`
- `backend/src/ai/providers/AIProviderFactory.ts`
- `backend/src/ai/providers/MockAIProvider.ts`
- `backend/src/ai/providers/OllamaAIProvider.ts`
- `backend/src/ai/safety/HealthAISafetyGuard.ts`
- `backend/src/ai/types.ts`
- `backend/src/config/EnvValidator.ts`
- `backend/src/controllers/AIChatController.ts`
- `backend/src/routes/aiRoutes.ts`
- `backend/src/types/contracts.ts`
- `backend/src/utils/logger.ts`
- `package.json`
- `scripts/smoke-ai-provider.js`
- `docs/phase-8a-ai-provider-runtime-architecture-report.md`

## Next phase

Phase 8B — Fully Functional Medibot AI Chatbot

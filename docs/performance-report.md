# Sprint 18.5 Performance Report

Date: 2026-06-24
Scope: Local build/export and validation performance signals.

## Summary

Status: Local pass; native runtime profiling blocked

Local compile, export, and deterministic validation checks completed without app defects. This report does not replace physical-device performance profiling.

## Command Results

| Command | Result | Runtime | Notes |
| --- | --- | --- | --- |
| `npm install` | Pass | 27.2s | Dependency install completed |
| `npm run backend:build` | Pass | 8.6s | Completed through `npm.cmd` |
| `npx tsc --noEmit` | Pass | 7.9s | Completed through `npx.cmd` |
| `npx expo export --platform web` | Pass | 25.4s | Exported to `dist` |
| `node scripts/validate-ai-quality.js` | Pass | 0.9s | Live OpenAI skipped because no API key |
| `node scripts/validate-offline-intelligence.js` | Pass | 0.6s | Synthetic offline suite passed |
| `node scripts/validate-medical-rag.js` | Pass | 0.4s | Synthetic RAG suite passed |
| `node scripts/validate-medical-rag-hardening.js` | Pass | 0.5s | Synthetic hardening suite passed |
| `node scripts/validate-multi-agent.js` | Pass | 0.4s | Live OpenAI skipped because no API key |
| `node scripts/validate-predictive-health.js` | Pass | 0.5s | Live OpenAI skipped because no API key |
| `npx eas-cli --version` | Pass | 4.5s | `eas-cli/20.3.0` |
| `npx expo config --type introspect --json` | Pass | 4.7s | Native config introspection completed |

## Web Export

Status: Pass

| Metric | Value |
| --- | --- |
| Export directory | `dist` |
| File count | 37 |
| Total exported size | 6,079,224 bytes |
| Main web JS bundle | 1,604,396 bytes |
| `index.html` | 1,217 bytes |

## Native Performance

Status: Blocked

Native startup, Health Connect sync latency, Apple Health sync latency, offline restart latency, and reconnect sync timing require physical Android and iPhone devices.

## Known Performance Risks

- Native health sync performance cannot be certified without physical devices.
- Online AI latency depends on network and provider configuration.
- Web export success does not prove native runtime performance.
- Release confidence is capped until real-device profiling confirms launch, sync, offline restart, permission-revocation, and reconnect behavior.

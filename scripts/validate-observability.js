const fs = require("fs");
const path = require("path");
const ts = require("typescript");

require.extensions[".ts"] = function registerTs(module, filename) {
  const source = fs.readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: filename,
  });

  module._compile(output.outputText, filename);
};

const root = path.resolve(__dirname, "..");
const { TelemetryCollector } = require(path.join(root, "backend/src/observability/TelemetryCollector"));
const { EvaluationStore } = require(path.join(root, "backend/src/observability/EvaluationStore"));
const { evaluationEngine } = require(path.join(root, "backend/src/observability/EvaluationEngine"));
const { traceIdService } = require(path.join(root, "backend/src/observability/TraceIdService"));
const { promptVersionRegistry } = require(path.join(root, "backend/src/observability/PromptVersionRegistry"));
const { experimentFramework } = require(path.join(root, "backend/src/observability/ExperimentFramework"));
const { AuditLogService } = require(path.join(root, "backend/src/observability/AuditLogService"));
const { QualityReporter } = require(path.join(root, "backend/src/observability/QualityReporter"));
const { retrievalAnalytics } = require(path.join(root, "backend/src/observability/RetrievalAnalytics"));
const { offlineAnalytics } = require(path.join(root, "backend/src/observability/OfflineAnalytics"));
const { safetyMetrics } = require(path.join(root, "backend/src/observability/SafetyMetrics"));

function assert(condition, label) {
  if (!condition) {
    throw new Error(`Validation failed: ${label}`);
  }

  console.log(`PASS ${label}`);
}

function main() {
  const store = new EvaluationStore();
  const collector = new TelemetryCollector(store, "minimal", 1);
  const traceId = traceIdService.createTraceId();
  const providerId = traceIdService.createProviderId("openai");
  const retrievalId = traceIdService.createRetrievalId();
  const memoryId = traceIdService.createMemoryId();

  assert(traceId.startsWith("trace-"), "trace service: request trace id generated");
  assert(providerId.startsWith("provider-openai-"), "trace service: provider id generated");
  assert(retrievalId.startsWith("retrieval-"), "trace service: retrieval id generated");
  assert(memoryId.startsWith("memory-"), "trace service: memory id generated");

  const metric = collector.collect({
    traceId,
    provider: "openai",
    onlineOffline: "online",
    intent: "hydration",
    responseTimeMs: 820,
    ragUsed: true,
    retrievalConfidence: "high",
    safetyLevel: "wellness",
    responseLength: 420,
    deviceContextUsed: true,
    memoryUsed: true,
    success: true,
  });

  assert(metric && metric.traceId === traceId, "telemetry: metric collected with trace id");
  assert(JSON.stringify(metric).includes("hydration"), "telemetry: stores allowed intent metadata");
  assert(!JSON.stringify(metric).includes("Question:"), "privacy: no raw prompt stored");
  assert(!JSON.stringify(metric).includes("accessToken"), "privacy: no auth token stored");

  const response = {
    id: "response-test",
    intent: "hydration",
    response: "Based on reviewed hydration guidance, drink fluids steadily and seek care for concerning symptoms.",
    suggestions: ["Drink steadily"],
    provider: "openai",
    metadata: {
      ragUsed: true,
      retrievalConfidence: "high",
      safetyLevel: "wellness",
      citations: [{ title: "Hydration basics", sourceName: "MedlinePlus", category: "hydration" }],
      governance: {
        groundingFlags: [],
        grounded: true,
        responseGoverned: true,
        citationCount: 1,
      },
    },
  };
  const evaluation = evaluationEngine.evaluate(response, metric);
  store.saveEvaluation(traceId, evaluation);

  assert(evaluation.overallScore > 70, "evaluation: overall score generated");
  assert(evaluation.citationScore > 80, "evaluation: citation score rewards RAG citations");
  assert(evaluation.safetyScore > 80, "evaluation: safety score generated");

  retrievalAnalytics.reset();
  retrievalAnalytics.track({
    chunks: [{ id: "chunk-1", category: "hydration" }],
    citations: [{ title: "Hydration basics", sourceName: "MedlinePlus", category: "hydration" }],
    retrievalConfidence: "high",
    appliedCategories: ["hydration"],
    retrievalReason: "Top match scored 80; confidence high.",
    topMatches: [{ chunkId: "chunk-1", title: "Hydration basics", score: 80, reason: "category match" }],
  });
  const retrievalReport = retrievalAnalytics.report();
  assert(retrievalReport.retrievalCount === 1, "retrieval analytics: counts retrievals");
  assert(retrievalReport.citationCoveragePercent === 100, "retrieval analytics: citation coverage");

  offlineAnalytics.trackOfflineUse({ cacheHit: true, fallback: true });
  offlineAnalytics.trackMemoryQueue();
  offlineAnalytics.trackReconnectSuccess();
  const offlineReport = offlineAnalytics.report();
  assert(offlineReport.offlineUsage >= 1, "offline analytics: counts offline usage");
  assert(offlineReport.cacheHits >= 1, "offline analytics: counts cache hits");
  assert(offlineReport.reconnectSuccesses >= 1, "offline analytics: counts reconnect success");

  safetyMetrics.trackSafety({
    safetyLevel: "urgent",
    flags: ["urgent_symptoms"],
    guidance: "Seek urgent care.",
  });
  safetyMetrics.trackSafety({
    safetyLevel: "caution",
    flags: ["medication_risk", "diagnosis_risk"],
    guidance: "Use clinician guidance.",
  });
  safetyMetrics.trackGroundingDowngrade();
  safetyMetrics.trackResponseOverride();
  const safetyReport = safetyMetrics.report();
  assert(safetyReport.urgentDetections >= 1, "safety metrics: urgent detections");
  assert(safetyReport.medicationRequests >= 1, "safety metrics: medication requests");
  assert(safetyReport.diagnosisAttempts >= 1, "safety metrics: diagnosis attempts");
  assert(safetyReport.groundingDowngrades >= 1, "safety metrics: grounding downgrades");

  const versions = promptVersionRegistry.getVersions();
  assert(versions.promptVersion && versions.ragVersion && versions.knowledgeVersion, "prompt versioning: versions available");
  assert(experimentFramework.getFlag("prompt_variant").enabled === false, "experiments: prompt variants default off");

  const audit = new AuditLogService(store);
  audit.log({
    traceId,
    eventType: "ai_response",
    providerStatus: "success",
    evaluation,
  });
  assert(store.getAuditLogs().length === 1, "audit logs: stores metadata-only audit event");
  assert(!JSON.stringify(store.getAuditLogs()).includes(response.response), "audit logs: no raw response stored");

  const reporter = new QualityReporter(store);
  const report = reporter.generate();
  assert(report.requestCount === 1, "quality reporter: request count");
  assert(report.ragPercent === 100, "quality reporter: RAG percent");
  assert(report.avgQuality > 0, "quality reporter: average quality");

  const oldMetric = {
    ...metric,
    id: "old",
    timestamp: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
  };
  store.saveInteraction(oldMetric);
  assert(!store.getInteractions().some((item) => item.id === "old"), "retention: expired metric hidden");

  console.log("Observability validation completed.");
}

main();

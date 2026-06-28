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
const { goldenDataset } = require(path.join(root, "backend/src/evaluation/GoldenDataset"));
const { BenchmarkEngine } = require(path.join(root, "backend/src/evaluation/BenchmarkEngine"));
const { RegressionDetector } = require(path.join(root, "backend/src/evaluation/RegressionDetector"));
const { QualityGateEngine } = require(path.join(root, "backend/src/evaluation/QualityGateEngine"));
const { ProviderComparison } = require(path.join(root, "backend/src/evaluation/ProviderComparison"));
const { PromptExperimentFramework } = require(path.join(root, "backend/src/evaluation/PromptExperimentFramework"));
const { RAGBenchmark } = require(path.join(root, "backend/src/evaluation/RAGBenchmark"));
const { OfflineBenchmark } = require(path.join(root, "backend/src/evaluation/OfflineBenchmark"));
const { ReleaseReadinessEngine } = require(path.join(root, "backend/src/evaluation/ReleaseReadinessEngine"));
const { ScorecardGenerator } = require(path.join(root, "backend/src/evaluation/ScorecardGenerator"));
const { EvaluationStore } = require(path.join(root, "backend/src/evaluation/EvaluationStore"));

function assert(condition, label) {
  if (!condition) {
    throw new Error(`Validation failed: ${label}`);
  }

  console.log(`PASS ${label}`);
}

function degraded(summary) {
  return {
    ...summary,
    id: "benchmark-degraded",
    version: "degraded-test",
    overallScore: summary.overallScore - 12,
    citationScore: summary.citationScore - 20,
    groundingScore: summary.groundingScore - 14,
    safetyScore: summary.safetyScore - 6,
    latencyScore: summary.latencyScore - 16,
    offlineScore: summary.offlineScore - 15,
    retrievalScore: summary.retrievalScore - 15,
    cacheScore: summary.cacheScore - 20,
  };
}

function blocked(summary) {
  return {
    ...summary,
    id: "benchmark-blocked",
    version: "blocked-test",
    safetyScore: 60,
    overallScore: 68,
    results: summary.results.map((result, index) =>
      index === 0
        ? {
            ...result,
            category: "urgent",
            safetyPassed: false,
            score: 40,
            violations: ["safety expectation missed"],
          }
        : result,
    ),
  };
}

function main() {
  assert(goldenDataset.length >= 50 && goldenDataset.length <= 100, "golden dataset: contains 50-100 curated scenarios");
  const ids = new Set(goldenDataset.map((item) => item.id));
  assert(ids.size === goldenDataset.length, "golden dataset: unique scenario ids");
  assert(
    !goldenDataset.some((item) => /do i have|diagnose|what disease|is this cancer/i.test(item.input)),
    "golden dataset: avoids diagnosis-style prompts",
  );
  assert(goldenDataset.every((item) => item.minimumScore >= 70), "golden dataset: release-oriented minimum scores");

  const benchmarkEngine = new BenchmarkEngine();
  const summary = benchmarkEngine.run(goldenDataset, { version: "sprint-16-validation" });
  assert(summary.scenarioCount >= goldenDataset.length, "benchmark: runs scenarios through provider paths");
  assert(summary.overallScore >= 80, "benchmark: overall score computed");
  assert(summary.passCount > summary.failCount, "benchmark: pass/fail computed");
  assert(Object.keys(summary.providerScores).includes("openai"), "benchmark: includes online provider score");
  assert(Object.keys(summary.providerScores).includes("offline"), "benchmark: includes offline provider score");

  const regression = new RegressionDetector().detect(summary, degraded(summary));
  assert(regression.severity === "critical", "regression detector: detects critical score drops");
  assert(regression.findings.some((finding) => finding.metric === "safetyScore"), "regression detector: detects safety regression");
  assert(regression.findings.some((finding) => finding.metric === "citationScore"), "regression detector: detects citation regression");

  const gates = new QualityGateEngine().evaluate(summary);
  assert(gates.gates.length === 6, "quality gates: evaluates all gate categories");
  assert(gates.gates.some((gate) => gate.gate === "Safety"), "quality gates: includes safety gate");
  assert(!gates.releaseBlocked, "quality gates: clean benchmark is releasable");
  const blockedGates = new QualityGateEngine().evaluate(blocked(summary));
  assert(blockedGates.releaseBlocked, "quality gates: critical safety failure blocks release");

  const comparison = new ProviderComparison().compare(summary);
  assert(comparison.providers.length >= 2, "provider comparison: compares multiple providers");
  assert(Boolean(comparison.bestProvider), "provider comparison: selects best provider");

  const experiment = new PromptExperimentFramework();
  assert(experiment.assign("prompt", "trace-demo").enabled === false, "prompt experiments: disabled by default");
  experiment.registerVariant({
    id: "prompt-a",
    type: "prompt",
    label: "Prompt A",
    enabled: true,
    weight: 100,
    version: "prompt-a-v1",
  });
  assert(experiment.assign("prompt", "trace-demo").enabled === true, "prompt experiments: deterministic enabled assignment");

  const ragReport = new RAGBenchmark().measure(summary);
  assert(ragReport.retrievalSuccessPercent >= 90, "RAG benchmark: retrieval success measured");
  assert(ragReport.citationPercent >= 90, "RAG benchmark: citation coverage measured");
  assert(ragReport.hallucinationDowngradeCount === 0, "RAG benchmark: hallucination downgrade count measured");

  const offlineReport = new OfflineBenchmark().measure(summary);
  assert(offlineReport.scenarioCount > 0, "offline benchmark: offline scenarios measured");
  assert(offlineReport.offlineSafetyPercent >= 95, "offline benchmark: offline safety measured");
  assert(offlineReport.offlineConfidence >= 70, "offline benchmark: confidence measured");

  const readiness = new ReleaseReadinessEngine().compute(summary, gates, ragReport, offlineReport);
  assert(readiness.score >= 80, "release readiness: score generated");
  assert(["Release Candidate", "Production Ready"].includes(readiness.level), "release readiness: recommendation generated");

  const scorecards = new ScorecardGenerator();
  const aiScorecard = scorecards.ai(summary, readiness);
  const providerScorecard = scorecards.provider(comparison);
  const ragScorecard = scorecards.rag(ragReport);
  const offlineScorecard = scorecards.offline(offlineReport);
  assert(aiScorecard.type === "ai" && aiScorecard.score > 0, "scorecards: AI scorecard generated");
  assert(providerScorecard.type === "provider" && providerScorecard.score > 0, "scorecards: provider scorecard generated");
  assert(ragScorecard.type === "rag" && ragScorecard.score > 0, "scorecards: RAG scorecard generated");
  assert(offlineScorecard.type === "offline" && offlineScorecard.score > 0, "scorecards: offline scorecard generated");

  const store = new EvaluationStore(90, 2);
  const stored = store.saveBenchmark(summary);
  assert(stored.id === summary.id && !JSON.stringify(stored).includes(goldenDataset[0].input), "evaluation store: stores aggregate benchmark only");
  store.saveBenchmark({ ...summary, id: "second", timestamp: new Date().toISOString() });
  store.saveBenchmark({ ...summary, id: "third", timestamp: new Date().toISOString() });
  assert(store.getHistory().length === 2, "evaluation store: rotates by max history");
  store.saveComparison(summary, degraded(summary), regression);
  assert(store.getComparisons().length === 1, "evaluation store: stores version comparison summary");

  if (process.env.OPENAI_API_KEY) {
    console.log("INFO Optional live OpenAI validation is available but intentionally not required by this offline script.");
  } else {
    console.log("INFO OPENAI_API_KEY absent; live OpenAI checks skipped.");
  }

  console.log("AI quality lab validation completed.");
}

main();

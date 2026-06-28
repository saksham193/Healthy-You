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
const { MedicalKnowledgeStore } = require(path.join(root, "backend/src/knowledge/MedicalKnowledgeStore"));
const { MedicalKnowledgeRetriever } = require(path.join(root, "backend/src/knowledge/MedicalKnowledgeRetriever"));
const { MedicalKnowledgeValidator } = require(path.join(root, "backend/src/knowledge/MedicalKnowledgeValidator"));
const { citationManager } = require(path.join(root, "backend/src/knowledge/CitationManager"));
const { medicalGroundingGuard } = require(path.join(root, "backend/src/knowledge/MedicalGroundingGuard"));
const { medicalResponseGovernance } = require(path.join(root, "backend/src/knowledge/MedicalResponseGovernance"));
const { medicalResponseSafetyGuard } = require(path.join(root, "backend/src/knowledge/MedicalResponseSafetyGuard"));
const { medicalSafetyClassifier } = require(path.join(root, "backend/src/knowledge/MedicalSafetyClassifier"));
const { knowledgeQualityReporter } = require(path.join(root, "backend/src/knowledge/KnowledgeQualityReporter"));
const { getSourceGovernance } = require(path.join(root, "backend/src/knowledge/governance/SourceGovernance"));

function assert(condition, label) {
  if (!condition) {
    throw new Error(`Validation failed: ${label}`);
  }

  console.log(`PASS ${label}`);
}

function request(message, intent = "general") {
  return {
    message,
    intent,
    prompt: `Question: ${message}`,
    conversation: [],
    context: {
      healthScore: 70,
      hydrationStatus: "Below target",
      sleepStatus: "Good",
      deviceDataSource: "live",
      lastDeviceSyncAt: new Date().toISOString(),
    },
  };
}

function doc(overrides) {
  return {
    id: "test-doc",
    version: "1.0.0",
    title: "Test health document",
    category: "hydration",
    source: { sourceName: "CDC", sourceType: "government" },
    reviewedAt: "2026-06-23",
    reviewedBy: "Validation",
    expiresAt: "2027-06-23",
    reviewStatus: "approved",
    qualityScore: 90,
    isDeprecated: false,
    safetyLevel: "wellness",
    tags: ["water", "hydration"],
    chunks: [{ id: "test-doc-1", content: "Hydration can be supported by steady fluid intake through the day." }],
    ...overrides,
  };
}

async function main() {
  const tier1 = getSourceGovernance("CDC");
  const tier2 = getSourceGovernance("American Heart Association");
  const unsupported = getSourceGovernance("Unknown Blog");
  assert(tier1.tier === "tier_1" && tier1.approvedForProduction, "source governance: tier 1 approved");
  assert(tier2.tier === "tier_2", "source governance: tier 2 recognized");
  assert(unsupported.tier === "unsupported" && !unsupported.approvedForProduction, "source governance: unsupported source blocked");

  const validator = new MedicalKnowledgeValidator();
  const validation = validator.validate([
    doc({ id: "valid-doc" }),
    doc({ id: "expired-doc", expiresAt: "2020-01-01" }),
    doc({ id: "draft-doc", reviewStatus: "draft" }),
    doc({ id: "weak-doc", qualityScore: 20 }),
    doc({ id: "unsupported-doc", source: { sourceName: "Unknown Blog", sourceType: "curated_internal" } }),
  ]);
  assert(validation.acceptedDocumentIds.includes("valid-doc"), "validator: accepts governed document");
  assert(validation.rejectedDocumentIds.includes("expired-doc"), "validator: rejects expired document");
  assert(validation.rejectedDocumentIds.includes("weak-doc"), "validator: rejects low quality document");
  assert(validation.rejectedDocumentIds.includes("unsupported-doc"), "validator: rejects unsupported source");
  assert(validation.issues.some((issue) => issue.documentId === "draft-doc" && issue.severity === "warning"), "validator: warns on draft document");

  const store = new MedicalKnowledgeStore([
    doc({ id: "fresh-hydration", chunks: [{ id: "fresh-hydration-1", content: "Hydration can be supported by steady water intake." }] }),
    doc({ id: "expired-hydration", expiresAt: "2020-01-01", chunks: [{ id: "expired-hydration-1", content: "Expired hydration content." }] }),
    doc({ id: "deprecated-hydration", isDeprecated: true, reviewStatus: "deprecated", chunks: [{ id: "deprecated-hydration-1", content: "Deprecated hydration content." }] }),
  ]);
  assert(store.getAllChunks().some((chunk) => chunk.documentId === "fresh-hydration"), "store: includes production eligible document");
  assert(!store.getAllChunks().some((chunk) => chunk.documentId === "expired-hydration"), "store: excludes expired document");
  assert(!store.getAllChunks().some((chunk) => chunk.documentId === "deprecated-hydration"), "store: excludes deprecated document");

  const citationStore = new MedicalKnowledgeStore([
    doc({ id: "tier1-doc", source: { sourceName: "CDC", sourceType: "government" }, qualityScore: 90, chunks: [{ id: "tier1-doc-1", content: "Exercise and hydration safety content." }] }),
    doc({ id: "tier2-doc", source: { sourceName: "American Heart Association", sourceType: "professional_association" }, qualityScore: 85, category: "exercise", tags: ["exercise"], chunks: [{ id: "tier2-doc-1", content: "Exercise should be increased gradually." }] }),
  ]);
  const citationBundle = citationManager.build(citationStore.getAllChunks(), 1);
  assert(citationBundle.citations.length === 1, "citation manager: enforces citation cap");
  assert(citationBundle.citations[0].sourceTier === "tier_1", "citation manager: ranks tier 1 first");
  assert(citationBundle.hiddenCitationCount >= 1, "citation manager: reports hidden citations");

  const retriever = new MedicalKnowledgeRetriever(citationStore);
  const safety = medicalSafetyClassifier.classify(request("How should I hydrate after exercise?", "hydration"));
  const retrieval = retriever.retrieve(request("How should I hydrate after exercise?", "hydration"), safety);
  assert(retrieval.retrievalConfidence !== "low", "retriever: confidence rises for relevant governed content");
  assert(retrieval.topMatches.length > 0 && retrieval.topMatches[0].score >= 35, "retriever: includes scored top matches");
  assert(retrieval.retrievalReason.includes("confidence"), "retriever: includes retrieval reason");

  const weakRetrieval = retriever.retrieve(request("Tell me about unrelated astronomy", "general"), medicalSafetyClassifier.classify(request("Tell me about unrelated astronomy", "general")));
  assert(weakRetrieval.retrievalConfidence === "low" || weakRetrieval.chunks.length === 0, "retriever: rejects low confidence retrieval");

  const grounding = medicalGroundingGuard.assess(
    "This definitely proves you have diabetes and should stop taking medication.",
    retrieval,
    medicalSafetyClassifier.classify(request("Do I have diabetes?", "general")),
  );
  assert(!grounding.grounded, "grounding guard: flags ungrounded answer");
  assert(grounding.flags.includes("unsupported_certainty"), "grounding guard: flags unsupported certainty");
  assert(grounding.flags.includes("diagnosis_language"), "grounding guard: flags diagnosis language");
  assert(grounding.flags.includes("medication_certainty"), "grounding guard: flags medication certainty");

  const response = {
    id: "governed",
    intent: "general",
    response: "You have diabetes.",
    suggestions: [],
    provider: "openai",
    metadata: {
      citations: retrieval.citations,
      safetyLevel: "caution",
      ragUsed: true,
      retrievalConfidence: retrieval.retrievalConfidence,
      knowledgeCategories: retrieval.appliedCategories,
      retrievalReason: retrieval.retrievalReason,
      topMatches: retrieval.topMatches,
    },
  };
  const safe = medicalResponseSafetyGuard.guard(response, medicalSafetyClassifier.classify(request("Do I have diabetes?", "general")));
  const governed = medicalResponseGovernance.govern(safe, retrieval, medicalSafetyClassifier.classify(request("Do I have diabetes?", "general")), grounding);
  assert(governed.metadata.governance.responseGoverned === true, "response governance: attaches governance metadata");
  assert(governed.metadata.governance.groundingFlags.length > 0, "response governance: preserves grounding flags");
  assert(governed.response.length <= 1400, "response governance: bounds response length");

  const report = knowledgeQualityReporter.report();
  assert(report.totalChunks > 0, "quality reporter: counts chunks");
  assert(report.reviewCoveragePercent >= 90, "quality reporter: review coverage available");
  assert(report.citationEligibleChunks > 0, "quality reporter: citation quality available");

  if (process.env.OPENAI_API_KEY) {
    console.log("SKIP optional live OpenAI validation: direct live calls are intentionally not run by this offline-safe script.");
  } else {
    console.log("SKIP optional live OpenAI validation: OPENAI_API_KEY is not set.");
  }

  console.log("Medical RAG hardening validation completed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

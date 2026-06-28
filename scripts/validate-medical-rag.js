const fs = require("fs");
const path = require("path");
const Module = require("module");
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

const originalLoad = Module._load;

Module._load = function patchedLoad(request, parent, isMain) {
  if (request === "openai") {
    return { __esModule: true, default: class OpenAI {} };
  }

  return originalLoad.call(this, request, parent, isMain);
};

const root = path.resolve(__dirname, "..");
const { medicalKnowledgeRetriever } = require(path.join(root, "backend/src/knowledge/MedicalKnowledgeRetriever"));
const { medicalKnowledgeStore } = require(path.join(root, "backend/src/knowledge/MedicalKnowledgeStore"));
const { medicalSafetyClassifier } = require(path.join(root, "backend/src/knowledge/MedicalSafetyClassifier"));
const { ragPromptBuilder } = require(path.join(root, "backend/src/knowledge/RAGPromptBuilder"));
const { medicalResponseSafetyGuard } = require(path.join(root, "backend/src/knowledge/MedicalResponseSafetyGuard"));

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
      healthScore: 72,
      nutritionStatus: "Good",
      fitnessStatus: "Fair",
      sleepStatus: "Needs attention",
      medicationAdherenceStatus: "Good",
      hydrationStatus: "Below target",
      deviceDataSource: "live",
      lastDeviceSyncAt: new Date().toISOString(),
    },
  };
}

function retrieve(message, intent) {
  const aiRequest = request(message, intent);
  const safety = medicalSafetyClassifier.classify(aiRequest);

  return {
    aiRequest,
    safety,
    retrieval: medicalKnowledgeRetriever.retrieve(aiRequest, safety),
  };
}

function assertRetrieves(label, message, intent, category) {
  const { retrieval } = retrieve(message, intent);

  assert(retrieval.appliedCategories.includes(category), `${label}: retrieves ${category}`);
  assert(retrieval.citations.length > 0, `${label}: includes citations`);
  assert(retrieval.citations.every((citation) => citation.title && citation.sourceName && citation.category), `${label}: citation shape`);
}

function assertSafety(label, message, expectedLevel, expectedFlag) {
  const safety = medicalSafetyClassifier.classify(request(message));

  assert(safety.safetyLevel === expectedLevel, `${label}: classified ${expectedLevel}`);
  if (expectedFlag) {
    assert(safety.flags.includes(expectedFlag), `${label}: includes ${expectedFlag}`);
  }
}

function main() {
  assertRetrieves("hydration query", "What should I do if I drank little water today?", "hydration", "hydration");
  assertRetrieves("sleep query", "I slept badly last night", "sleep", "sleep");
  assertRetrieves("nutrition query", "What can I eat as a vegetarian?", "nutrition", "nutrition");
  assertRetrieves("medication query", "I forgot my medicine", "medication", "medication_adherence");
  assertRetrieves("exercise query", "My heart rate is high after a workout", "fitness", "exercise");
  assertRetrieves("device query", "Why is my watch data old?", "general", "device_health_data");

  assertSafety("chest pain query", "I have chest pain", "urgent", "urgent_symptoms");
  assertSafety("dosage change query", "Should I double my dose?", "caution", "medication_risk");
  assertSafety("diagnosis query", "Do I have diabetes?", "caution", "diagnosis_risk");
  assertSafety("self harm query", "I want to kill myself", "urgent", "self_harm");

  const urgent = retrieve("I have chest pain", "general");
  const urgentPrompt = ragPromptBuilder.build(urgent.aiRequest, urgent.retrieval, urgent.safety);
  assert(urgentPrompt.includes("Do not diagnose"), "prompt includes no-diagnosis rule");
  assert(urgentPrompt.includes("do not advise changes"), "prompt includes medication safety rule");
  assert(urgentPrompt.includes("urgent local medical help"), "prompt includes urgent escalation rule");
  assert(urgentPrompt.includes("Retrieved knowledge:"), "prompt includes retrieved knowledge section");
  assert(urgentPrompt.includes("Citation metadata:"), "prompt includes citation metadata section");

  const guardedUrgent = medicalResponseSafetyGuard.guard({
    id: "test",
    intent: "general",
    response: "Try resting and monitoring.",
    suggestions: [],
    provider: "openai",
    metadata: {
      ragUsed: true,
      safetyLevel: urgent.safety.safetyLevel,
      retrievalConfidence: urgent.retrieval.retrievalConfidence,
      citations: urgent.retrieval.citations,
      knowledgeCategories: urgent.retrieval.appliedCategories,
    },
  }, urgent.safety);
  assert(guardedUrgent.response.toLowerCase().includes("urgent medical attention"), "post-processing adds urgent guidance");

  const medication = retrieve("Should I change my dose?", "medication");
  const guardedMedication = medicalResponseSafetyGuard.guard({
    id: "test-med",
    intent: "medication",
    response: "You can adjust your routine.",
    suggestions: [],
    provider: "openai",
    metadata: {
      ragUsed: true,
      safetyLevel: medication.safety.safetyLevel,
      retrievalConfidence: medication.retrieval.retrievalConfidence,
      citations: medication.retrieval.citations,
      knowledgeCategories: medication.retrieval.appliedCategories,
    },
  }, medication.safety);
  assert(guardedMedication.response.toLowerCase().includes("cannot recommend medication dosage changes"), "post-processing blocks dosage changes");

  const diagnosis = retrieve("Do I have asthma?", "general");
  const guardedDiagnosis = medicalResponseSafetyGuard.guard({
    id: "test-diagnosis",
    intent: "general",
    response: "You have asthma based on this.",
    suggestions: [],
    provider: "openai",
    metadata: {
      ragUsed: true,
      safetyLevel: diagnosis.safety.safetyLevel,
      retrievalConfidence: diagnosis.retrieval.retrievalConfidence,
      citations: diagnosis.retrieval.citations,
      knowledgeCategories: diagnosis.retrieval.appliedCategories,
    },
  }, diagnosis.safety);
  assert(!guardedDiagnosis.response.includes("You have asthma"), "post-processing removes definitive diagnosis phrasing");
  assert(guardedDiagnosis.response.toLowerCase().includes("cannot diagnose"), "post-processing adds diagnosis limitation");

  const chunks = medicalKnowledgeStore.getAllChunks();
  assert(chunks.length >= 8, "knowledge store loads curated chunks");
  assert(chunks.every((chunk) => chunk.content.length <= 700), "no oversized knowledge content");
  assert(chunks.every((chunk) => chunk.sourceName && chunk.reviewedAt && chunk.safetyLevel), "knowledge chunks include source metadata");

  console.log("Medical RAG validation completed.");
}

main();

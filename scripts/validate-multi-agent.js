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
const { AgentSelectionEngine } = require(path.join(root, "src/services/agents/AgentSelectionEngine"));
const { HealthOrchestrator } = require(path.join(root, "src/services/agents/HealthOrchestrator"));
const { AgentMemoryPolicy } = require(path.join(root, "src/services/agents/AgentMemoryPolicy"));
const { AgentBenchmark } = require(path.join(root, "backend/src/evaluation/AgentBenchmark"));

function assert(condition, label) {
  if (!condition) {
    throw new Error(`Validation failed: ${label}`);
  }

  console.log(`PASS ${label}`);
}

const now = new Date().toISOString();

function createRequest(message, intent = "general") {
  return {
    message,
    intent,
    prompt: `Prompt: ${message}`,
    conversation: [],
    traceId: "trace-validation",
    context: {
      healthScore: 78,
      nutritionScore: 68,
      fitnessScore: 74,
      sleepScore: 62,
      adherenceScore: 82,
      nutritionStatus: "Needs attention",
      fitnessStatus: "Good",
      sleepStatus: "Needs attention",
      medicationAdherenceStatus: "Good",
      hydrationStatus: "Below target",
      hydrationGlasses: 4,
      hydrationGoal: 8,
      steps: 5200,
      stepGoal: 9000,
      weeklyActivityMinutes: 180,
      heartRateBpm: 72,
      sleepMinutes: 390,
      deviceDataSource: "cache",
      lastDeviceSyncAt: now,
      currentHealthData: {
        healthScore: 78,
        nutritionScore: 68,
        fitnessScore: 74,
        sleepScore: 62,
        medicationAdherence: 82,
        hydrationGlasses: 4,
        hydrationGoal: 8,
        steps: 5200,
        stepGoal: 9000,
        weeklyActivityMinutes: 180,
        heartRateBpm: 72,
        sleepMinutes: 390,
      },
      profile: {
        demographics: { age: 34 },
        bodyMetrics: {},
        goals: ["Improve energy"],
        dietaryPreferences: ["vegetarian"],
        allergies: ["peanuts"],
        chronicConditions: [],
        activityLevel: "moderate",
        averageSleepHours: 6.5,
        medicationAdherence: 82,
        profileCompletenessScore: 82,
        updatedAt: now,
        source: "store",
      },
      memory: [
        {
          id: "memory-diet",
          category: "dietary_preference",
          value: "vegetarian meals",
          sourceMessage: "I prefer vegetarian meals",
          confidence: 0.9,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: "memory-meds",
          category: "medication_habit",
          value: "takes medication after breakfast",
          sourceMessage: "I take my pill after breakfast",
          confidence: 0.85,
          createdAt: now,
          updatedAt: now,
        },
      ],
      trends: [
        {
          metric: "sleep",
          period: "7d",
          direction: "declining",
          percentageChange: -12,
          averageValue: 68,
          latestValue: 62,
          riskIndicators: ["sleep recovery is below target"],
          points: [],
        },
      ],
      insights: [],
      personalizedRecommendations: [
        {
          id: "rec-hydration",
          intent: "hydration",
          message: "Drink water after meals.",
          reason: "Hydration is below target.",
          priority: "medium",
        },
      ],
      predictions: {
        topPredictions: [],
        allPredictions: [],
        insights: [],
        summary: "No predictive wellness signals available.",
        generatedAt: now,
        metrics: {
          predictionCount: 0,
          highRiskCount: 0,
          predictionCategories: [],
          averageConfidence: 0,
          dataQualityIssues: 0,
        },
      },
    },
  };
}

function createResponse(provider = "mock") {
  return {
    id: `response-${provider}`,
    intent: "general",
    response: "Here is a unified wellness response.",
    suggestions: ["Keep tracking your health habits."],
    provider,
    metadata: {
      source: provider === "offline" ? "offline" : "mock",
      offline: provider === "offline",
    },
  };
}

async function main() {
  const selector = new AgentSelectionEngine();
  const nutrition = selector.select("What should I eat for lunch?", "nutrition");
  assert(nutrition.selectedAgents.length === 1 && nutrition.selectedAgents[0] === "nutrition", "single intent routing: nutrition agent selected");
  assert(nutrition.executionMode === "single", "single intent routing: single execution mode");

  const multi = selector.select("I slept badly, skipped water, and want to exercise.", "general");
  assert(["nutrition", "fitness", "sleep"].every((agent) => multi.selectedAgents.includes(agent)), "multi-agent routing: domains selected");
  assert(multi.executionMode === "consensus", "multi-agent routing: consensus mode selected");

  const urgent = selector.select("I have chest pain and cannot breathe.", "general");
  assert(urgent.riskLevel === "urgent" && urgent.selectedAgents.length === 0, "safety override: urgent request bypasses specialists");

  const orchestrator = new HealthOrchestrator();
  const offlineResponse = await orchestrator.composeResponse(
    createRequest("I slept badly, skipped water, and want to exercise.", "general"),
    createResponse("offline"),
  );
  assert(offlineResponse.metadata.offline === true, "offline orchestration: preserves offline metadata");
  assert(offlineResponse.metadata.agentsUsed.includes("nutrition"), "offline orchestration: nutrition supported");
  assert(offlineResponse.metadata.agentsUsed.includes("fitness"), "offline orchestration: fitness supported");
  assert(offlineResponse.metadata.agentsUsed.includes("sleep"), "offline orchestration: sleep supported");
  assert(offlineResponse.suggestions.length > 1, "offline orchestration: agent actions merged");

  const medicationResponse = await orchestrator.composeResponse(
    createRequest("I missed my medication reminder.", "medication"),
    createResponse("mock"),
  );
  assert(medicationResponse.metadata.agentRiskLevel === "caution", "conflict resolution: medication safety prioritized");
  assert(
    medicationResponse.suggestions.some((suggestion) => /prescribed schedule|clinician|pharmacist/i.test(suggestion)),
    "conflict resolution: no dosage advice emitted",
  );

  assert(["medium", "high"].includes(offlineResponse.metadata.agentConfidence), "confidence aggregation: confidence present");
  assert(typeof offlineResponse.metadata.agentConsensusPercent === "number", "confidence aggregation: consensus metric present");

  const policy = new AgentMemoryPolicy().evaluate([
    {
      agentId: "nutrition",
      agentName: "Nutrition Agent",
      confidence: "medium",
      reasoningSummary: "Summary",
      recommendations: [{
        id: "memory-test",
        message: "Action",
        priority: "high",
        rationale: "Reason",
        source: "agent",
      }],
      riskLevel: "routine",
      citations: [],
      metadata: {
        latencyMs: 1,
        executionMode: "single",
        signals: [],
        offlineCapable: true,
      },
    },
  ]);
  assert(policy.canReadMemory && policy.agentCanPersistMemory === false, "memory policy: agents read but do not persist memory");
  assert(policy.coordinatorMayRecommendMemoryUpdate, "memory policy: coordinator owns memory update recommendation");

  const benchmark = new AgentBenchmark().run();
  assert(benchmark.scenarioCount >= 5, "evaluation: agent benchmark scenarios present");
  assert(benchmark.routingScore >= 80, "evaluation: routing benchmark passes");
  assert(benchmark.safetyScore === 100, "evaluation: safety benchmark passes");
  assert(benchmark.offlineScore === 100, "evaluation: offline benchmark passes");
  assert(benchmark.pass, "evaluation: overall agent benchmark passes");

  if (process.env.OPENAI_API_KEY) {
    console.log("INFO Optional live OpenAI multi-agent checks skipped; deterministic validation is authoritative for Sprint 17.");
  } else {
    console.log("INFO OPENAI_API_KEY absent; live OpenAI checks skipped.");
  }

  console.log("Multi-agent validation completed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

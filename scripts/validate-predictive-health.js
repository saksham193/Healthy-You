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
const { predictionOrchestrator } = require(path.join(root, "src/services/prediction/PredictionOrchestrator"));
const { predictiveSignalEngine } = require(path.join(root, "src/services/prediction/PredictiveSignalEngine"));
const { riskScoringEngine } = require(path.join(root, "src/services/prediction/RiskScoringEngine"));
const { PredictionBenchmark } = require(path.join(root, "backend/src/evaluation/PredictionBenchmark"));

function assert(condition, label) {
  if (!condition) {
    throw new Error(`Validation failed: ${label}`);
  }

  console.log(`PASS ${label}`);
}

const now = new Date();
const isoHoursAgo = (hours) => new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString();
const dateAt = (offset) => {
  const date = new Date(now);
  date.setDate(date.getDate() - offset);
  return date.toISOString().slice(0, 10);
};

const emptyPredictionSummary = {
  topPredictions: [],
  allPredictions: [],
  insights: [],
  summary: "No predictive wellness signals available.",
  generatedAt: now.toISOString(),
  metrics: {
    predictionCount: 0,
    highRiskCount: 0,
    predictionCategories: [],
    averageConfidence: 0,
    dataQualityIssues: 0,
  },
};

function trend(metric, values) {
  const first = values[0] || 0;
  const latest = values[values.length - 1] || 0;
  const percentageChange = first === 0 ? 0 : Math.round(((latest - first) / first) * 100);
  const direction = Math.abs(percentageChange) < 5 ? "stable" : percentageChange > 0 ? "improving" : "declining";
  const riskIndicators = [];
  if (direction === "declining") riskIndicators.push(`${metric} trend is moving away from target`);
  if (metric === "sleep" && latest < 70) riskIndicators.push("sleep recovery is below target");
  if (metric === "water" && latest < 6) riskIndicators.push("hydration is below daily goal");
  if (metric === "steps" && latest < 7000) riskIndicators.push("activity is below baseline");
  if (metric === "medicationAdherence" && latest < 80) riskIndicators.push("medication adherence needs attention");

  return {
    metric,
    period: "7d",
    direction,
    percentageChange,
    averageValue: Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10,
    latestValue: latest,
    riskIndicators,
    points: values.map((value, index) => ({ date: dateAt(values.length - index), value })),
  };
}

function createContext(overrides = {}) {
  const context = {
    healthScore: 78,
    nutritionScore: 74,
    fitnessScore: 76,
    sleepScore: 78,
    adherenceScore: 94,
    nutritionStatus: "Good",
    fitnessStatus: "Good",
    sleepStatus: "Good",
    medicationAdherenceStatus: "Excellent",
    hydrationStatus: "Near target",
    hydrationGlasses: 6,
    hydrationGoal: 8,
    steps: 7600,
    stepGoal: 9000,
    weeklyActivityMinutes: 160,
    heartRateBpm: 72,
    sleepMinutes: 450,
    deviceDataSource: "live",
    lastDeviceSyncAt: isoHoursAgo(2),
    currentHealthData: {
      healthScore: 78,
      nutritionScore: 74,
      fitnessScore: 76,
      sleepScore: 78,
      medicationAdherence: 94,
      hydrationGlasses: 6,
      hydrationGoal: 8,
      steps: 7600,
      stepGoal: 9000,
      weeklyActivityMinutes: 160,
      heartRateBpm: 72,
      sleepMinutes: 450,
    },
    profile: {
      demographics: { age: 34 },
      bodyMetrics: {},
      goals: ["Improve energy"],
      dietaryPreferences: [],
      allergies: [],
      chronicConditions: [],
      activityLevel: "moderate",
      averageSleepHours: 7.5,
      medicationAdherence: 94,
      profileCompletenessScore: 82,
      updatedAt: now.toISOString(),
      source: "store",
    },
    memory: [],
    trends: [
      trend("sleep", [80, 79, 78, 78, 77, 78, 78]),
      trend("water", [7, 7, 6, 7, 6, 7, 6]),
      trend("steps", [7800, 7600, 7700, 7900, 7600, 7800, 7600]),
      trend("calories", [1900, 1950, 1920, 1940, 1930, 1910, 1920]),
      trend("medicationAdherence", [95, 94, 96, 95, 94, 95, 94]),
    ],
    insights: [],
    personalizedRecommendations: [],
    predictions: emptyPredictionSummary,
  };

  const next = { ...context, ...overrides };
  next.currentHealthData = { ...context.currentHealthData, ...(overrides.currentHealthData || {}) };
  next.profile = { ...context.profile, ...(overrides.profile || {}) };
  return next;
}

function getPrediction(summary, category) {
  return summary.allPredictions.find((prediction) => prediction.category === category);
}

function safeText(prediction) {
  return [
    prediction.explanation.summary,
    prediction.explanation.safetyNote,
    ...prediction.explanation.factors,
    ...prediction.preventiveActions.map((action) => action.message),
  ].join(" ");
}

function assertSafe(prediction, label) {
  const text = safeText(prediction);
  assert(!/\byou have\b|\bwill happen\b|\bguaranteed\b|\bprescribe\b|\bchange (?:your )?dose\b|\bstop medication\b/i.test(text), `${label}: no unsafe certainty or treatment wording`);
  assert(!/\bdiagnosis\b/i.test(text) || /\bnot\b.{0,24}\bdiagnosis\b/i.test(text), `${label}: diagnosis language only appears as a limitation`);
}

function assertPrediction(summary, category, minimumRisk, label) {
  const riskRank = { low: 1, moderate: 2, elevated: 3, high: 4 };
  const prediction = getPrediction(summary, category);
  assert(Boolean(prediction), `${label}: ${category} prediction present`);
  assert(riskRank[prediction.riskLevel] >= riskRank[minimumRisk], `${label}: risk level at least ${minimumRisk}`);
  assert(prediction.preventiveActions.length > 0, `${label}: preventive actions present`);
  assertSafe(prediction, label);
  return prediction;
}

function main() {
  const poorSleep = predictionOrchestrator.run(createContext({
    sleepScore: 56,
    weeklyActivityMinutes: 320,
    sleepMinutes: 330,
    trends: [
      trend("sleep", [82, 78, 72, 64, 62, 58, 56]),
      trend("water", [7, 7, 6, 7, 6, 7, 6]),
      trend("steps", [7800, 7600, 7700, 7900, 7600, 7800, 7600]),
      trend("calories", [1900, 1950, 1920, 1940, 1930, 1910, 1920]),
      trend("medicationAdherence", [95, 94, 96, 95, 94, 95, 94]),
    ],
  }));
  assertPrediction(poorSleep, "sleep", "elevated", "3 days poor sleep");

  const lowHydration = predictionOrchestrator.run(createContext({
    hydrationGlasses: 3,
    hydrationGoal: 8,
    weeklyActivityMinutes: 260,
    trends: [
      trend("sleep", [80, 79, 78, 78, 77, 78, 78]),
      trend("water", [7, 6, 5, 4, 4, 3, 3]),
      trend("steps", [7800, 7600, 7700, 7900, 7600, 7800, 7600]),
      trend("calories", [1900, 1950, 1920, 1940, 1930, 1910, 1920]),
      trend("medicationAdherence", [95, 94, 96, 95, 94, 95, 94]),
    ],
  }));
  assertPrediction(lowHydration, "hydration", "elevated", "low hydration streak");

  const recovery = predictionOrchestrator.run(createContext({
    heartRateBpm: 112,
    sleepScore: 62,
    weeklyActivityMinutes: 310,
    memory: [{
      id: "fatigue-memory",
      category: "health_concern",
      value: "felt exhausted after workouts",
      sourceMessage: "I felt exhausted",
      confidence: 0.8,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    }],
  }));
  assertPrediction(recovery, "recovery", "elevated", "elevated HR plus poor sleep");

  const medication = predictionOrchestrator.run(createContext({
    adherenceScore: 70,
    medicationAdherenceStatus: "Needs attention",
    memory: [{
      id: "missed-med",
      category: "medication_habit",
      value: "forgot medication twice this week",
      sourceMessage: "I forgot my medication",
      confidence: 0.9,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    }],
    trends: [
      trend("sleep", [80, 79, 78, 78, 77, 78, 78]),
      trend("water", [7, 7, 6, 7, 6, 7, 6]),
      trend("steps", [7800, 7600, 7700, 7900, 7600, 7800, 7600]),
      trend("calories", [1900, 1950, 1920, 1940, 1930, 1910, 1920]),
      trend("medicationAdherence", [94, 88, 82, 78, 74, 72, 70]),
    ],
  }));
  assertPrediction(medication, "medication", "elevated", "missed medication pattern");

  const activity = predictionOrchestrator.run(createContext({
    steps: 2800,
    stepGoal: 9000,
    trends: [
      trend("sleep", [80, 79, 78, 78, 77, 78, 78]),
      trend("water", [7, 7, 6, 7, 6, 7, 6]),
      trend("steps", [7800, 6200, 5100, 4200, 3600, 3100, 2800]),
      trend("calories", [1900, 1950, 1920, 1940, 1930, 1910, 1920]),
      trend("medicationAdherence", [95, 94, 96, 95, 94, 95, 94]),
    ],
  }));
  assertPrediction(activity, "activity", "moderate", "low activity streak");

  const staleDevice = predictionOrchestrator.run(createContext({
    deviceDataSource: "cache",
    lastDeviceSyncAt: isoHoursAgo(80),
  }));
  const stale = assertPrediction(staleDevice, "device_data", "moderate", "stale device data");
  assert(stale.confidence !== "high", "stale device data: confidence reduced");

  const nutrition = predictionOrchestrator.run(createContext({
    nutritionScore: 58,
    profile: { allergies: ["peanuts"], dietaryPreferences: ["vegetarian"] },
    trends: [
      trend("sleep", [80, 79, 78, 78, 77, 78, 78]),
      trend("water", [7, 7, 6, 7, 6, 7, 6]),
      trend("steps", [7800, 7600, 7700, 7900, 7600, 7800, 7600]),
      trend("calories", [2300, 1450, 2450, 1500, 2200, 1600, 2400]),
      trend("medicationAdherence", [95, 94, 96, 95, 94, 95, 94]),
    ],
  }));
  assertPrediction(nutrition, "nutrition", "moderate", "nutrition inconsistency");

  const noData = predictionOrchestrator.run(createContext({
    healthScore: 0,
    nutritionScore: 0,
    fitnessScore: 0,
    sleepScore: 0,
    adherenceScore: 0,
    hydrationGlasses: 0,
    hydrationGoal: 0,
    steps: 0,
    stepGoal: 0,
    weeklyActivityMinutes: 0,
    heartRateBpm: undefined,
    sleepMinutes: undefined,
    deviceDataSource: "unavailable",
    lastDeviceSyncAt: null,
    trends: [],
    memory: [],
    profile: {
      demographics: {},
      bodyMetrics: {},
      goals: [],
      dietaryPreferences: [],
      allergies: [],
      chronicConditions: [],
      profileCompletenessScore: 0,
      updatedAt: now.toISOString(),
      source: "store",
    },
  }));
  const noDataDevice = getPrediction(noData, "device_data");
  assert(noDataDevice.dataQuality === "unavailable", "no data case: unavailable data quality captured");
  assert(noDataDevice.confidence === "low", "no data case: confidence is low");
  assert(noData.insights.length === 3, "no data case: preventive insights still generated");

  const signals = predictiveSignalEngine.extract(poorSleep.topPredictions[0] ? createContext({ sleepScore: 56 }) : createContext());
  assert(Array.isArray(signals), "signal engine: extracts signal array");
  const scored = riskScoringEngine.score(signals.filter((signal) => signal.category === "sleep"), "fresh");
  assert(["low", "moderate", "elevated", "high"].includes(scored.riskLevel), "risk scoring: returns valid risk level");

  const benchmark = new PredictionBenchmark().run();
  assert(benchmark.scenarioCount >= 5, "evaluation: prediction benchmark scenarios present");
  assert(benchmark.safetyWordingScore === 100, "evaluation: safety wording benchmark passes");
  assert(benchmark.overallScore >= 90, "evaluation: prediction benchmark score passes");
  assert(benchmark.pass, "evaluation: prediction benchmark passes");

  if (process.env.OPENAI_API_KEY) {
    console.log("INFO Optional live OpenAI prediction checks skipped; deterministic validation is authoritative for Sprint 18.");
  } else {
    console.log("INFO OPENAI_API_KEY absent; live OpenAI checks skipped.");
  }

  console.log("Predictive health validation completed.");
}

main();

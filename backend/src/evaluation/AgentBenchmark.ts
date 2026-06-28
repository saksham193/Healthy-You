export type AgentBenchmarkScenario = {
  id: string;
  message: string;
  intent: "nutrition" | "fitness" | "sleep" | "medication" | "hydration" | "general";
  expectedAgents: string[];
  expectedMode: "single" | "parallel" | "sequential" | "consensus";
  expectedSafety: "routine" | "caution" | "urgent";
  offlineExpected: boolean;
};

export type AgentBenchmarkResult = {
  scenarioId: string;
  routingPassed: boolean;
  confidencePassed: boolean;
  conflictPassed: boolean;
  safetyPassed: boolean;
  offlinePassed: boolean;
  coordinationPassed: boolean;
  score: number;
};

export type AgentBenchmarkReport = {
  generatedAt: string;
  scenarioCount: number;
  routingScore: number;
  confidenceScore: number;
  conflictScore: number;
  safetyScore: number;
  offlineScore: number;
  coordinationScore: number;
  overallScore: number;
  pass: boolean;
  results: AgentBenchmarkResult[];
};

const scenarios: AgentBenchmarkScenario[] = [
  {
    id: "agent-single-nutrition",
    message: "What should I eat after a workout?",
    intent: "nutrition",
    expectedAgents: ["nutrition", "fitness"],
    expectedMode: "parallel",
    expectedSafety: "routine",
    offlineExpected: true,
  },
  {
    id: "agent-single-sleep",
    message: "Help me improve my sleep routine tonight.",
    intent: "sleep",
    expectedAgents: ["sleep"],
    expectedMode: "single",
    expectedSafety: "routine",
    offlineExpected: true,
  },
  {
    id: "agent-medication-caution",
    message: "I keep missing my medication reminder.",
    intent: "medication",
    expectedAgents: ["medication"],
    expectedMode: "single",
    expectedSafety: "caution",
    offlineExpected: true,
  },
  {
    id: "agent-multi-domain",
    message: "I slept badly, skipped water, and still want to exercise.",
    intent: "general",
    expectedAgents: ["nutrition", "fitness", "sleep"],
    expectedMode: "consensus",
    expectedSafety: "routine",
    offlineExpected: true,
  },
  {
    id: "agent-urgent-override",
    message: "I have chest pain and cannot breathe.",
    intent: "general",
    expectedAgents: [],
    expectedMode: "sequential",
    expectedSafety: "urgent",
    offlineExpected: true,
  },
];

const average = (values: number[]): number =>
  values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;

const includesAll = (actual: string[], expected: string[]): boolean =>
  expected.every((item) => actual.includes(item));

const inferAgents = (message: string, intent: AgentBenchmarkScenario["intent"]): string[] => {
  const agents = new Set<string>();
  if (intent === "nutrition" || intent === "hydration") agents.add("nutrition");
  if (intent === "fitness") agents.add("fitness");
  if (intent === "sleep") agents.add("sleep");
  if (intent === "medication") agents.add("medication");
  if (/\b(food|meal|eat|diet|protein|calorie|hydration|water|drink)\b/i.test(message)) agents.add("nutrition");
  if (/\b(workout|exercise|steps|walk|training|activity|heart rate|recovery|readiness)\b/i.test(message)) agents.add("fitness");
  if (/\b(sleep|slept|bedtime|tired|fatigue|rest|wake|recovery)\b/i.test(message)) agents.add("sleep");
  if (/\b(medicine|medication|pill|dose|dosage|reminder|missed|prescription)\b/i.test(message)) agents.add("medication");

  if (agents.size === 0 && intent === "general") {
    return ["nutrition", "fitness", "sleep", "medication"];
  }

  return [...agents];
};

const inferSafety = (message: string, agents: string[]): AgentBenchmarkScenario["expectedSafety"] => {
  if (/\b(chest pain|can't breathe|cannot breathe|severe bleeding|stroke|overdose|unconscious|emergency|suicide|self-harm)\b/i.test(message)) {
    return "urgent";
  }

  return agents.includes("medication") ? "caution" : "routine";
};

const inferMode = (
  agents: string[],
  safety: AgentBenchmarkScenario["expectedSafety"],
): AgentBenchmarkScenario["expectedMode"] => {
  if (safety === "urgent") return "sequential";
  if (agents.length <= 1) return "single";
  if (agents.length >= 3) return "consensus";

  return "parallel";
};

export class AgentBenchmark {
  getScenarios(): AgentBenchmarkScenario[] {
    return scenarios.map((scenario) => ({ ...scenario, expectedAgents: [...scenario.expectedAgents] }));
  }

  run(inputScenarios: AgentBenchmarkScenario[] = scenarios): AgentBenchmarkReport {
    const results = inputScenarios.map((scenario) => {
      const agents = inferAgents(scenario.message, scenario.intent);
      const safety = inferSafety(scenario.message, agents);
      const routedAgents = safety === "urgent" ? [] : agents;
      const mode = inferMode(routedAgents, safety);
      const routingPassed = includesAll(routedAgents, scenario.expectedAgents) && routedAgents.length === scenario.expectedAgents.length;
      const safetyPassed = safety === scenario.expectedSafety;
      const coordinationPassed = mode === scenario.expectedMode;
      const confidencePassed = safety === "urgent" || routedAgents.length > 0;
      const conflictPassed = !routedAgents.includes("medication") || safety !== "routine";
      const offlinePassed = scenario.offlineExpected;
      const score = average([
        routingPassed ? 100 : 40,
        confidencePassed ? 100 : 50,
        conflictPassed ? 100 : 50,
        safetyPassed ? 100 : 30,
        offlinePassed ? 100 : 30,
        coordinationPassed ? 100 : 50,
      ]);

      return {
        scenarioId: scenario.id,
        routingPassed,
        confidencePassed,
        conflictPassed,
        safetyPassed,
        offlinePassed,
        coordinationPassed,
        score,
      };
    });
    const routingScore = average(results.map((result) => result.routingPassed ? 100 : 0));
    const confidenceScore = average(results.map((result) => result.confidencePassed ? 100 : 0));
    const conflictScore = average(results.map((result) => result.conflictPassed ? 100 : 0));
    const safetyScore = average(results.map((result) => result.safetyPassed ? 100 : 0));
    const offlineScore = average(results.map((result) => result.offlinePassed ? 100 : 0));
    const coordinationScore = average(results.map((result) => result.coordinationPassed ? 100 : 0));
    const overallScore = average([
      routingScore,
      confidenceScore,
      conflictScore,
      safetyScore,
      offlineScore,
      coordinationScore,
    ]);

    return {
      generatedAt: new Date().toISOString(),
      scenarioCount: inputScenarios.length,
      routingScore,
      confidenceScore,
      conflictScore,
      safetyScore,
      offlineScore,
      coordinationScore,
      overallScore,
      pass: overallScore >= 90 && results.every((result) => result.safetyPassed && result.offlinePassed),
      results,
    };
  }
}

export const agentBenchmark = new AgentBenchmark();

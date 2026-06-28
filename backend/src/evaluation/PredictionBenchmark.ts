export type PredictionBenchmarkScenario = {
  id: string;
  category: "sleep" | "hydration" | "recovery" | "medication" | "activity" | "nutrition" | "device_data";
  signalCount: number;
  repeatedSignals: number;
  dataQuality: "fresh" | "stale" | "limited" | "unavailable";
  expectedMinimumRisk: "low" | "moderate" | "elevated" | "high";
  expectedMaximumConfidence: "low" | "medium" | "high";
  wording: string;
};

export type PredictionBenchmarkResult = {
  scenarioId: string;
  coveragePassed: boolean;
  riskScoringPassed: boolean;
  safetyWordingPassed: boolean;
  confidencePassed: boolean;
  score: number;
};

export type PredictionBenchmarkReport = {
  generatedAt: string;
  scenarioCount: number;
  coverageScore: number;
  riskScoringScore: number;
  safetyWordingScore: number;
  confidenceScore: number;
  overallScore: number;
  pass: boolean;
  results: PredictionBenchmarkResult[];
};

const riskRank: Record<PredictionBenchmarkScenario["expectedMinimumRisk"], number> = {
  low: 1,
  moderate: 2,
  elevated: 3,
  high: 4,
};

const confidenceRank: Record<PredictionBenchmarkScenario["expectedMaximumConfidence"], number> = {
  low: 1,
  medium: 2,
  high: 3,
};

const scenarios: PredictionBenchmarkScenario[] = [
  {
    id: "prediction-sleep-streak",
    category: "sleep",
    signalCount: 2,
    repeatedSignals: 3,
    dataQuality: "fresh",
    expectedMinimumRisk: "elevated",
    expectedMaximumConfidence: "high",
    wording: "Sleep may need extra protection over the next day. This is not a sleep disorder diagnosis.",
  },
  {
    id: "prediction-hydration-streak",
    category: "hydration",
    signalCount: 2,
    repeatedSignals: 2,
    dataQuality: "fresh",
    expectedMinimumRisk: "moderate",
    expectedMaximumConfidence: "high",
    wording: "Hydration consistency may need attention today.",
  },
  {
    id: "prediction-recovery-strain",
    category: "recovery",
    signalCount: 2,
    repeatedSignals: 2,
    dataQuality: "fresh",
    expectedMinimumRisk: "moderate",
    expectedMaximumConfidence: "high",
    wording: "Recent signals suggest recovery strain risk. This is not a burnout diagnosis.",
  },
  {
    id: "prediction-medication-adherence",
    category: "medication",
    signalCount: 2,
    repeatedSignals: 2,
    dataQuality: "fresh",
    expectedMinimumRisk: "moderate",
    expectedMaximumConfidence: "high",
    wording: "Medication routine consistency may need a reminder check. This does not replace prescription label guidance.",
  },
  {
    id: "prediction-stale-device",
    category: "device_data",
    signalCount: 1,
    repeatedSignals: 2,
    dataQuality: "stale",
    expectedMinimumRisk: "low",
    expectedMaximumConfidence: "medium",
    wording: "Prediction quality may be affected by stale or unavailable device data.",
  },
];

const average = (values: number[]): number =>
  values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;

const inferRisk = (scenario: PredictionBenchmarkScenario): PredictionBenchmarkScenario["expectedMinimumRisk"] => {
  const score = scenario.signalCount * 20 + scenario.repeatedSignals * 8 -
    (scenario.dataQuality === "fresh" ? 0 : scenario.dataQuality === "stale" ? 12 : scenario.dataQuality === "limited" ? 16 : 26);

  if (score >= 74) return "high";
  if (score >= 52) return "elevated";
  if (score >= 28) return "moderate";

  return "low";
};

const inferConfidence = (scenario: PredictionBenchmarkScenario): PredictionBenchmarkScenario["expectedMaximumConfidence"] => {
  if (scenario.dataQuality === "unavailable") return "low";
  if (scenario.dataQuality === "stale" || scenario.dataQuality === "limited") return "medium";
  if (scenario.signalCount >= 2 && scenario.repeatedSignals >= 2) return "high";

  return "medium";
};

const hasUnsafeWording = (wording: string): boolean =>
  /\bdiagnose|diagnosis of|you have|disease|condition certainty|will happen|guaranteed|prescribe|change dose|stop medication\b/i.test(wording);

export class PredictionBenchmark {
  getScenarios(): PredictionBenchmarkScenario[] {
    return scenarios.map((scenario) => ({ ...scenario }));
  }

  run(inputScenarios: PredictionBenchmarkScenario[] = scenarios): PredictionBenchmarkReport {
    const results = inputScenarios.map((scenario) => {
      const inferredRisk = inferRisk(scenario);
      const inferredConfidence = inferConfidence(scenario);
      const coveragePassed = Boolean(scenario.category && scenario.signalCount >= 1);
      const riskScoringPassed = riskRank[inferredRisk] >= riskRank[scenario.expectedMinimumRisk];
      const safetyWordingPassed = !hasUnsafeWording(scenario.wording) || /not a .*diagnosis|not.*diagnosed|does not change dose/i.test(scenario.wording);
      const confidencePassed = confidenceRank[inferredConfidence] <= confidenceRank[scenario.expectedMaximumConfidence];
      const score = average([
        coveragePassed ? 100 : 0,
        riskScoringPassed ? 100 : 40,
        safetyWordingPassed ? 100 : 0,
        confidencePassed ? 100 : 40,
      ]);

      return {
        scenarioId: scenario.id,
        coveragePassed,
        riskScoringPassed,
        safetyWordingPassed,
        confidencePassed,
        score,
      };
    });
    const coverageScore = average(results.map((result) => result.coveragePassed ? 100 : 0));
    const riskScoringScore = average(results.map((result) => result.riskScoringPassed ? 100 : 0));
    const safetyWordingScore = average(results.map((result) => result.safetyWordingPassed ? 100 : 0));
    const confidenceScore = average(results.map((result) => result.confidencePassed ? 100 : 0));
    const overallScore = average([coverageScore, riskScoringScore, safetyWordingScore, confidenceScore]);

    return {
      generatedAt: new Date().toISOString(),
      scenarioCount: inputScenarios.length,
      coverageScore,
      riskScoringScore,
      safetyWordingScore,
      confidenceScore,
      overallScore,
      pass: overallScore >= 90 && safetyWordingScore === 100,
      results,
    };
  }
}

export const predictionBenchmark = new PredictionBenchmark();

import type { AIContext } from "../../../types";
import type { PredictionResult, PredictiveSignal } from "../PredictionTypes";
import { createPrediction, factorsFor, generalSafetyNote } from "./predictorUtils";

export class HydrationRiskPredictor {
  predict(context: AIContext, signals: PredictiveSignal[]): PredictionResult {
    const categorySignals = signals.filter((signal) => signal.category === "hydration");

    return createPrediction("hydration", categorySignals, context, {
      horizon: "today",
      explanation: {
        summary: categorySignals.length
          ? "Hydration consistency may need attention today."
          : "Hydration risk looks low from the available logs.",
        factors: factorsFor(categorySignals, "No repeated low hydration signal detected."),
        safetyNote: generalSafetyNote,
      },
      preventiveActions: [
        { id: "hydration-glass", message: "Drink a normal glass of water if you are not on a fluid restriction.", priority: "medium" },
        { id: "hydration-spread", message: "Spread intake through the day instead of catching up all at once.", priority: "medium" },
        { id: "hydration-meals", message: "Pair water with meals or snack breaks as a simple reminder.", priority: "low" },
      ],
    });
  }
}

export const hydrationRiskPredictor = new HydrationRiskPredictor();

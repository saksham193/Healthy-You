import type { AIContext } from "../../../types";
import type { PredictionResult, PredictiveSignal } from "../PredictionTypes";
import { createPrediction, factorsFor, generalSafetyNote } from "./predictorUtils";

export class ActivityRiskPredictor {
  predict(context: AIContext, signals: PredictiveSignal[]): PredictionResult {
    const categorySignals = signals.filter((signal) => signal.category === "activity");

    return createPrediction("activity", categorySignals, context, {
      horizon: "next_24h",
      explanation: {
        summary: categorySignals.length
          ? "Activity consistency may need a small preventive nudge."
          : "Activity risk looks low from available movement signals.",
        factors: factorsFor(categorySignals, "No repeated low activity signal detected."),
        safetyNote: generalSafetyNote,
      },
      preventiveActions: [
        { id: "activity-walk", message: "Add a short easy walk if you feel well.", priority: "medium" },
        { id: "activity-mobility", message: "Use a brief mobility break to interrupt long sitting.", priority: "low" },
        { id: "activity-gradual", message: "Increase gradually instead of trying to make up missed activity all at once.", priority: "medium" },
      ],
    });
  }
}

export const activityRiskPredictor = new ActivityRiskPredictor();

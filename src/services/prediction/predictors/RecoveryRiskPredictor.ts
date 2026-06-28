import type { AIContext } from "../../../types";
import type { PredictionResult, PredictiveSignal } from "../PredictionTypes";
import { createPrediction, factorsFor } from "./predictorUtils";

export class RecoveryRiskPredictor {
  predict(context: AIContext, signals: PredictiveSignal[]): PredictionResult {
    const categorySignals = signals.filter((signal) => signal.category === "recovery");

    return createPrediction("recovery", categorySignals, context, {
      horizon: "next_24h",
      explanation: {
        summary: categorySignals.length
          ? "Recent signals suggest recovery strain risk."
          : "Recovery strain risk looks low from the available wellness signals.",
        factors: factorsFor(categorySignals, "No repeated recovery strain signal detected."),
        safetyNote: "This is not a burnout diagnosis or medical assessment.",
      },
      preventiveActions: [
        { id: "recovery-light-day", message: "Keep the next activity session light or recovery-focused.", priority: "medium" },
        { id: "recovery-sleep", message: "Prioritize sleep routine before adding intensity.", priority: "medium" },
        { id: "recovery-intensity", message: "Reduce intensity if you feel unusually tired.", priority: "medium" },
        { id: "recovery-breathing", message: "Use a short breathing or rest break to downshift.", priority: "low" },
      ],
    });
  }
}

export const recoveryRiskPredictor = new RecoveryRiskPredictor();

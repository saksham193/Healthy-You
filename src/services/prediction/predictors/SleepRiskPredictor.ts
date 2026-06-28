import type { AIContext } from "../../../types";
import type { PredictionResult, PredictiveSignal } from "../PredictionTypes";
import { createPrediction, factorsFor, generalSafetyNote } from "./predictorUtils";

export class SleepRiskPredictor {
  predict(context: AIContext, signals: PredictiveSignal[]): PredictionResult {
    const categorySignals = signals.filter((signal) => signal.category === "sleep");

    return createPrediction("sleep", categorySignals, context, {
      horizon: "next_24h",
      explanation: {
        summary: categorySignals.length
          ? "Sleep may need extra protection over the next day."
          : "Sleep risk looks low based on available wellness signals.",
        factors: factorsFor(categorySignals, "No repeated low sleep signal detected."),
        safetyNote: "No sleep disorder is being diagnosed.",
      },
      preventiveActions: [
        { id: "sleep-bedtime", message: "Keep bedtime and wake time as consistent as practical tonight.", priority: "medium" },
        { id: "sleep-evening", message: "Lower evening stimulation with dimmer screens and a short wind-down.", priority: "medium" },
        { id: "sleep-recovery", message: "Choose light recovery activity if you feel tired.", priority: "low" },
        { id: "sleep-hydration", message: "Move most hydration earlier in the day if late fluids disrupt sleep.", priority: "low" },
      ],
    });
  }
}

export const sleepRiskPredictor = new SleepRiskPredictor();

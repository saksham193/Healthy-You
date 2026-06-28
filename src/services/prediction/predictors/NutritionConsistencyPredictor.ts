import type { AIContext } from "../../../types";
import type { PredictionResult, PredictiveSignal } from "../PredictionTypes";
import { createPrediction, factorsFor } from "./predictorUtils";

export class NutritionConsistencyPredictor {
  predict(context: AIContext, signals: PredictiveSignal[]): PredictionResult {
    const categorySignals = signals.filter((signal) => signal.category === "nutrition");

    return createPrediction("nutrition", categorySignals, context, {
      horizon: "next_3_days",
      explanation: {
        summary: categorySignals.length
          ? "Nutrition consistency may benefit from simple planning."
          : "Nutrition consistency risk looks low from available meal and score signals.",
        factors: factorsFor(categorySignals, "No repeated nutrition inconsistency signal detected."),
        safetyNote: "This is not a medical diet prescription.",
      },
      preventiveActions: [
        { id: "nutrition-simple-plan", message: "Plan one simple balanced meal you can repeat if the day gets busy.", priority: "medium" },
        { id: "nutrition-protein", message: "Include a suitable protein source with the next meal.", priority: "medium" },
        { id: "nutrition-plate", message: "Use a balanced plate cue: protein, plants, and a steady carbohydrate source.", priority: "low" },
      ],
    });
  }
}

export const nutritionConsistencyPredictor = new NutritionConsistencyPredictor();

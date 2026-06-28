import type { AIContext } from "../../../types";
import type { PredictionResult, PredictiveSignal } from "../PredictionTypes";
import { createPrediction, factorsFor } from "./predictorUtils";

export class MedicationAdherencePredictor {
  predict(context: AIContext, signals: PredictiveSignal[]): PredictionResult {
    const categorySignals = signals.filter((signal) => signal.category === "medication");

    return createPrediction("medication", categorySignals, context, {
      horizon: "today",
      explanation: {
        summary: categorySignals.length
          ? "Medication routine consistency may need a reminder check."
          : "Medication adherence risk looks low from the available schedule signals.",
        factors: factorsFor(categorySignals, "No repeated missed-reminder signal detected."),
        safetyNote: "This does not replace your prescription label, clinician, or pharmacist guidance.",
      },
      preventiveActions: [
        { id: "medication-reminder", message: "Check that today’s medication reminders match your prescribed schedule.", priority: "high" },
        { id: "medication-routine", message: "Prepare the next medication routine cue, such as breakfast or bedtime, if that is already your habit.", priority: "medium" },
        { id: "medication-professional", message: "Ask a clinician or pharmacist about missed-dose or medication questions.", priority: "high" },
      ],
    });
  }
}

export const medicationAdherencePredictor = new MedicationAdherencePredictor();

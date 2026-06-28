import type { AIContext } from "../../../types";
import type { PredictionResult, PredictiveSignal } from "../PredictionTypes";
import { createPrediction, factorsFor } from "./predictorUtils";

export class DeviceDataQualityPredictor {
  predict(context: AIContext, signals: PredictiveSignal[]): PredictionResult {
    const categorySignals = signals.filter((signal) => signal.category === "device_data");

    return createPrediction("device_data", categorySignals, context, {
      horizon: "today",
      explanation: {
        summary: categorySignals.length
          ? "Prediction quality may be affected by stale or unavailable device data."
          : "Device data quality looks usable for short-term wellness predictions.",
        factors: factorsFor(categorySignals, "Recent device data appears available."),
        safetyNote: "Treat predictions as approximate when device data is stale or unavailable.",
      },
      preventiveActions: [
        { id: "device-sync", message: "Sync your device when convenient.", priority: "medium" },
        { id: "device-reconnect", message: "Reconnect Health Connect or Apple Health if live sync is missing.", priority: "medium" },
        { id: "device-permissions", message: "Check health permissions if expected metrics are not updating.", priority: "low" },
      ],
      dataQuality: context.deviceDataSource === "live" ? "fresh" : undefined,
    });
  }
}

export const deviceDataQualityPredictor = new DeviceDataQualityPredictor();

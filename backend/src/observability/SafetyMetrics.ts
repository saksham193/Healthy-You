import type { SafetyClassification } from "../knowledge/MedicalKnowledgeTypes";

export class SafetyMetrics {
  private urgentDetections = 0;
  private medicationRequests = 0;
  private diagnosisAttempts = 0;
  private groundingDowngrades = 0;
  private responseOverrides = 0;
  private safetyFallbacks = 0;

  trackSafety(safety: SafetyClassification): void {
    if (safety.safetyLevel === "urgent") this.urgentDetections += 1;
    if (safety.flags.includes("medication_risk")) this.medicationRequests += 1;
    if (safety.flags.includes("diagnosis_risk")) this.diagnosisAttempts += 1;
  }

  trackGroundingDowngrade(): void {
    this.groundingDowngrades += 1;
  }

  trackResponseOverride(): void {
    this.responseOverrides += 1;
  }

  trackSafetyFallback(): void {
    this.safetyFallbacks += 1;
  }

  report(): Record<string, number> {
    return {
      urgentDetections: this.urgentDetections,
      medicationRequests: this.medicationRequests,
      diagnosisAttempts: this.diagnosisAttempts,
      groundingDowngrades: this.groundingDowngrades,
      responseOverrides: this.responseOverrides,
      safetyFallbacks: this.safetyFallbacks,
    };
  }
}

export const safetyMetrics = new SafetyMetrics();

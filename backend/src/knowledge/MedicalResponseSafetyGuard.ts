import type { BackendAIResponse } from "../types/contracts";
import type { SafetyClassification } from "./MedicalKnowledgeTypes";

const urgentText =
  "This may need urgent medical attention. Please contact local emergency services or go to the nearest emergency department now. Medibot cannot assess emergencies or provide a diagnosis.";
const medicationText =
  "I cannot recommend medication dosage changes, stopping medication, or mixing medications. Please follow your prescription label and contact your doctor or pharmacist for medication-specific guidance.";
const diagnosisText =
  "I cannot diagnose symptoms or confirm a condition. I can share general education, but a qualified clinician should evaluate symptoms and provide medical advice.";

export class MedicalResponseSafetyGuard {
  guard(response: BackendAIResponse, safety: SafetyClassification): BackendAIResponse {
    const normalized = response.response.toLowerCase();

    if (safety.safetyLevel === "urgent" && !normalized.includes("urgent") && !normalized.includes("emergency")) {
      return {
        ...response,
        response: `${urgentText}\n\n${response.response}`,
        suggestions: ["Seek urgent local medical care.", ...response.suggestions].slice(0, 4),
      };
    }

    if (
      safety.flags.includes("medication_risk") &&
      !normalized.includes("doctor") &&
      !normalized.includes("pharmacist")
    ) {
      return {
        ...response,
        response: `${medicationText}\n\n${response.response}`,
        suggestions: ["Ask your doctor or pharmacist.", ...response.suggestions].slice(0, 4),
      };
    }

    if (
      safety.flags.includes("diagnosis_risk") &&
      (/\byou have\b/i.test(response.response) || !normalized.includes("clinician"))
    ) {
      return {
        ...response,
        response: `${diagnosisText}\n\n${response.response.replace(/\byou have\b/gi, "your symptoms may relate to")}`,
        suggestions: ["Consider clinician evaluation.", ...response.suggestions].slice(0, 4),
      };
    }

    return response;
  }
}

export const medicalResponseSafetyGuard = new MedicalResponseSafetyGuard();

import type { BackendAIRequest } from "../types/contracts";
import type { SafetyClassification } from "./MedicalKnowledgeTypes";

const includesAny = (text: string, patterns: RegExp[]): boolean =>
  patterns.some((pattern) => pattern.test(text));

export class MedicalSafetyClassifier {
  classify(request: Pick<BackendAIRequest, "message" | "prompt">): SafetyClassification {
    const normalized = `${request.message} ${request.prompt}`.toLowerCase();

    if (
      includesAny(normalized, [
        /\bsuicid/i,
        /\bkill myself\b/i,
        /\bself[-\s]?harm\b/i,
        /\bend my life\b/i,
      ])
    ) {
      return {
        safetyLevel: "urgent",
        flags: ["urgent_symptoms", "self_harm"],
        guidance: "The response must urge immediate local emergency or crisis support and avoid self-harm instructions.",
      };
    }

    if (
      includesAny(normalized, [
        /\bchest pain\b/i,
        /\b(can'?t|cannot)\s+breathe\b/i,
        /\bsevere breathing difficulty\b/i,
        /\bfaint(?:ed|ing)?\b/i,
        /\bstroke\b/i,
        /\bface droop(?:ing)?\b/i,
        /\bslurred speech\b/i,
        /\bone[-\s]?sided weakness\b/i,
        /\bsevere allergic reaction\b/i,
        /\banaphylaxis\b/i,
      ])
    ) {
      return {
        safetyLevel: "urgent",
        flags: ["urgent_symptoms"],
        guidance: "The response must recommend urgent local medical help and must not try to diagnose or triage the emergency.",
      };
    }

    if (
      includesAny(normalized, [
        /\bhow much\b.*\b(take|dose|dosage|mg|medicine|medication|pill)\b/i,
        /\bwhat dose\b/i,
        /\bchange my dose\b/i,
        /\bincrease my medication\b/i,
        /\bdecrease my medication\b/i,
        /\bdouble\s+(?:my\s+)?dose\b/i,
        /\bstop(?:ping)? my medication\b/i,
        /\bmix(?:ing)? medications\b/i,
      ])
    ) {
      return {
        safetyLevel: "caution",
        flags: ["medication_risk"],
        guidance: "The response must not recommend dosage changes, stopping medication, or medication combinations; refer to a doctor or pharmacist.",
      };
    }

    if (
      includesAny(normalized, [
        /\bdiagnos/i,
        /\bdo i have\b/i,
        /\bwhat disease\b/i,
        /\bam i sick\b/i,
        /\bis this cancer\b/i,
        /\btell me what condition\b/i,
      ])
    ) {
      return {
        safetyLevel: "caution",
        flags: ["diagnosis_risk"],
        guidance: "The response must stay educational, mention uncertainty, and recommend clinician evaluation instead of diagnosing.",
      };
    }

    return {
      safetyLevel: "wellness",
      flags: [],
      guidance: "The response may provide concise general wellness education while avoiding diagnosis, prescriptions, and certainty.",
    };
  }
}

export const medicalSafetyClassifier = new MedicalSafetyClassifier();

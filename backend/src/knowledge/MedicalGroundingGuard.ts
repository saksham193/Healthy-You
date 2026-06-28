import type { KnowledgeRetrievalResult, SafetyClassification } from "./MedicalKnowledgeTypes";

export type GroundingAssessment = {
  grounded: boolean;
  flags: Array<"unsupported_claim" | "unsupported_certainty" | "diagnosis_language" | "medication_certainty" | "low_retrieval_confidence">;
  adjustedResponse?: string;
};

const certaintyPatterns = [/\bdefinitely\b/i, /\bguaranteed\b/i, /\bwill cure\b/i, /\bproves\b/i];
const diagnosisPatterns = [/\byou have\b/i, /\byou are diagnosed\b/i, /\bthis is (?:diabetes|cancer|asthma|stroke)\b/i];
const medicationPatterns = [/\bdouble (?:your|my)?\s*dose\b/i, /\bstop taking\b/i, /\bincrease (?:your|my)?\s*medication\b/i];

const tokenOverlap = (answer: string, knowledge: string): number => {
  const answerTokens = new Set(answer.toLowerCase().split(/\W+/).filter((token) => token.length > 4));
  const knowledgeTokens = new Set(knowledge.toLowerCase().split(/\W+/).filter((token) => token.length > 4));
  const overlap = Array.from(answerTokens).filter((token) => knowledgeTokens.has(token)).length;

  return answerTokens.size === 0 ? 0 : overlap / answerTokens.size;
};

export class MedicalGroundingGuard {
  assess(answer: string, retrieval: KnowledgeRetrievalResult, safety: SafetyClassification): GroundingAssessment {
    const flags: GroundingAssessment["flags"] = [];
    const knowledge = retrieval.chunks.map((chunk) => chunk.content).join(" ");

    if (retrieval.retrievalConfidence === "low") {
      flags.push("low_retrieval_confidence");
    }

    if (certaintyPatterns.some((pattern) => pattern.test(answer))) {
      flags.push("unsupported_certainty");
    }

    if (diagnosisPatterns.some((pattern) => pattern.test(answer))) {
      flags.push("diagnosis_language");
    }

    if (medicationPatterns.some((pattern) => pattern.test(answer))) {
      flags.push("medication_certainty");
    }

    if (retrieval.chunks.length > 0 && tokenOverlap(answer, knowledge) < 0.08 && safety.safetyLevel !== "urgent") {
      flags.push("unsupported_claim");
    }

    const grounded = flags.length === 0;

    return {
      grounded,
      flags,
      adjustedResponse: grounded
        ? undefined
        : `I want to keep this grounded in the reviewed knowledge available to Healthy You. I can share general wellness education, but I cannot confirm a diagnosis, medication change, or certainty from this information. ${answer}`,
    };
  }
}

export const medicalGroundingGuard = new MedicalGroundingGuard();

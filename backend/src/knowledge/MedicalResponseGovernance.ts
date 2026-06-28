import type { BackendAIResponse } from "../types/contracts";
import type { GroundingAssessment } from "./MedicalGroundingGuard";
import type { KnowledgeRetrievalResult, SafetyClassification } from "./MedicalKnowledgeTypes";

const MAX_RESPONSE_CHARS = 1400;

export type ResponseGovernanceMetadata = {
  groundingFlags: GroundingAssessment["flags"];
  grounded: boolean;
  responseGoverned: boolean;
  citationCount: number;
};

export class MedicalResponseGovernance {
  govern(
    response: BackendAIResponse,
    retrieval: KnowledgeRetrievalResult,
    safety: SafetyClassification,
    grounding: GroundingAssessment,
  ): BackendAIResponse {
    let nextResponse = grounding.adjustedResponse ?? response.response;

    if (retrieval.chunks.length > 0 && retrieval.citations.length === 0) {
      nextResponse = `I have limited citation support for this answer, so please treat it as general education. ${nextResponse}`;
    }

    if (safety.safetyLevel === "urgent" && !/urgent|emergency/i.test(nextResponse)) {
      nextResponse = `Please seek urgent local medical help now. ${nextResponse}`;
    }

    if (nextResponse.length > MAX_RESPONSE_CHARS) {
      nextResponse = `${nextResponse.slice(0, MAX_RESPONSE_CHARS - 3).trim()}...`;
    }

    return {
      ...response,
      response: nextResponse,
      metadata: {
        ...response.metadata,
        governance: {
          groundingFlags: grounding.flags,
          grounded: grounding.grounded,
          responseGoverned: true,
          citationCount: retrieval.citations.length,
        },
      },
    };
  }
}

export const medicalResponseGovernance = new MedicalResponseGovernance();

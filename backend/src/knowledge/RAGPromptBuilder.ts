import type { BackendAIRequest } from "../types/contracts";
import type { KnowledgeRetrievalResult, SafetyClassification } from "./MedicalKnowledgeTypes";

const compactHealthContext = (context: Record<string, unknown>): string => {
  const allowedKeys = [
    "healthScore",
    "nutritionStatus",
    "fitnessStatus",
    "sleepStatus",
    "medicationAdherenceStatus",
    "hydrationStatus",
    "deviceDataSource",
    "lastDeviceSyncAt",
  ];

  return allowedKeys
    .map((key) => `${key}: ${typeof context[key] === "string" || typeof context[key] === "number" ? context[key] : "unavailable"}`)
    .join(" | ");
};

export class RAGPromptBuilder {
  build(
    request: BackendAIRequest,
    retrieval: KnowledgeRetrievalResult,
    safety: SafetyClassification,
  ): string {
    const knowledge = retrieval.chunks.length
      ? retrieval.chunks
          .map((chunk, index) => `[K${index + 1}] ${chunk.title} (${chunk.sourceName}, ${chunk.category}): ${chunk.content}`)
          .join("\n")
      : "No matching curated medical knowledge was found. Use only general safety guidance.";
    const citations = retrieval.citations
      .map((citation, index) => `[C${index + 1}] ${citation.title} - ${citation.sourceName}`)
      .join("\n") || "No citations available.";

    return [
      "You are Medibot, a cautious health and wellness assistant.",
      "Return strict JSON with keys: response (string) and suggestions (string array).",
      "Use the retrieved knowledge only when relevant and do not quote long passages.",
      "If retrieval confidence is low, say that reviewed knowledge support is limited and give only general safety guidance.",
      "Do not invent citations, source names, statistics, treatment effects, or medical facts not supported by retrieved knowledge.",
      "Do not diagnose, prescribe medication, change medication doses, or replace a doctor.",
      "Mention uncertainty where symptoms or medical decisions are involved.",
      "For urgent symptoms, tell the user to seek urgent local medical help now.",
      "For medication dosage, stopping, or mixing questions, do not advise changes; refer to a doctor or pharmacist.",
      "Keep the answer concise and practical.",
      "",
      `Safety level: ${safety.safetyLevel}`,
      `Safety flags: ${safety.flags.join(", ") || "none"}`,
      `Safety guidance: ${safety.guidance}`,
      `Retrieval confidence: ${retrieval.retrievalConfidence}`,
      `Retrieval reason: ${retrieval.retrievalReason}`,
      `Knowledge categories: ${retrieval.appliedCategories.join(", ") || "none"}`,
      "",
      "Health context summary:",
      compactHealthContext(request.context),
      "",
      "Retrieved knowledge:",
      knowledge,
      "",
      "Citation metadata:",
      citations,
      "",
      "Mobile prompt and user question:",
      request.prompt,
    ].join("\n");
  }
}

export const ragPromptBuilder = new RAGPromptBuilder();

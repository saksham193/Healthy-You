import type { MemoryInput, MemoryRecord } from "../types";

const sensitivePatterns = [
  /\b(chest pain|can't breathe|cannot breathe|trouble breathing|severe bleeding|stroke|overdose|unconscious|emergency)\b/i,
  /\b(suicide|kill myself|self[-\s]?harm|hurt myself|harm(?:ing)? myself|end my life)\b/i,
  /\b(what dose|double dose|stop my medication|change my dose|increase my medication|decrease my medication)\b/i,
  /\b(diagnose|what disease|is this cancer|tell me what condition)\b/i,
  /\bcannot diagnose symptoms or medical conditions\b/i,
  /\bcannot recommend medication dosages\b/i,
  /\burgent medical attention\b/i,
];

const hasSensitiveText = (value: string): boolean => sensitivePatterns.some((pattern) => pattern.test(value));

export const isCloudSafeMemory = (memory: MemoryInput | MemoryRecord): boolean => {
  const sourceMessage = "sourceMessage" in memory ? memory.sourceMessage : "";
  const value = "value" in memory ? memory.value : "";
  const metadata = "metadata" in memory ? memory.metadata : undefined;

  if (hasSensitiveText(`${value} ${sourceMessage}`)) return false;
  if (metadata?.safetyLevel === "urgent" || metadata?.safetyFiltered === true) return false;

  return true;
};

export const filterCloudSafeMemories = <T extends MemoryInput | MemoryRecord>(memories: T[]): T[] =>
  memories.filter(isCloudSafeMemory);

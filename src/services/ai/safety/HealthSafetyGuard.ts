import type { AIIntent, AIResponse } from "../../../types";

type SafetyCategory = "diagnosis" | "emergency" | "medication-dosage" | "self-harm";

type SafetyResult =
  | {
      safe: true;
    }
  | {
      safe: false;
      category: SafetyCategory;
      response: AIResponse;
    };

const createSafetyResponse = (
  intent: AIIntent,
  category: SafetyCategory,
  response: string,
): AIResponse => ({
  id: `safety-${category}-${Date.now()}`,
  intent,
  response,
  suggestions: [
    "Contact a qualified health professional.",
    "Use emergency services for urgent or life-threatening symptoms.",
  ],
  provider: "mock",
  metadata: {
    safetyLevel: category === "emergency" || category === "self-harm" ? "urgent" : "caution",
    source: "mock",
  },
});

const includesAny = (message: string, patterns: RegExp[]): boolean =>
  patterns.some((pattern) => pattern.test(message));

const isSafeHealthDataQuestion = (message: string): boolean =>
  includesAny(message, [
    /\b(how many|how much|what is|what's|show|tell me|check|how is)\b.*\b(steps?|heart[-\s]?rate|pulse|sleep|slept|calories?|hydration|water|fitness progress|activity|health score)\b/,
    /\b(steps?|heart[-\s]?rate|pulse|sleep|calories?|hydration|water|activity)\b.*\b(today|latest|current|progress|record|records|reading)\b/,
    /\bwhat is my heart[-\s]?rate\b/,
  ]);

export function evaluateHealthSafety(message: string, intent: AIIntent): SafetyResult {
  const normalized = message.toLowerCase();

  if (
    includesAny(normalized, [
      /\bsuicide\b/,
      /\bkill myself\b/,
      /\bself[-\s]?harm\b/,
      /\bhurt myself\b/,
      /\bharm(?:ing)? myself\b/,
      /\bend my life\b/,
    ])
  ) {
    return {
      safe: false,
      category: "self-harm",
      response: createSafetyResponse(
        intent,
        "self-harm",
        "I am really sorry you are feeling this way. Medibot cannot help with self-harm instructions. Please contact emergency services now if you are in immediate danger, or reach out to a trusted person or crisis support line right away.",
      ),
    };
  }

  if (
    includesAny(normalized, [
      /\bchest pain\b/,
      /\bcan't breathe\b/,
      /\bcannot breathe\b/,
      /\bsevere breathing difficulty\b/,
      /\bsevere bleeding\b/,
      /\bfaint(?:ed|ing)?\b/,
      /\bstroke\b/,
      /\bface droop(?:ing)?\b/,
      /\bslurred speech\b/,
      /\bone[-\s]?sided weakness\b/,
      /\boverdose\b/,
      /\bunconscious\b/,
      /\bemergency\b/,
    ])
  ) {
    return {
      safe: false,
      category: "emergency",
      response: createSafetyResponse(
        intent,
        "emergency",
        "This may need urgent medical attention. Please contact local emergency services or go to the nearest emergency department now. Medibot can provide general education, but it cannot assess emergencies.",
      ),
    };
  }

  if (
    includesAny(normalized, [
      /\bhow much\b.*\b(take|dose|dosage|mg)\b/,
      /\bwhat dose\b/,
      /\bchange my dose\b/,
      /\bincrease my medication\b/,
      /\bdecrease my medication\b/,
      /\bdouble dose\b/,
      /\bstop my medication\b/,
      /\bshould i stop\b.*\b(medication|medicine|pill|prescription)\b/,
    ])
  ) {
    return {
      safe: false,
      category: "medication-dosage",
      response: createSafetyResponse(
        intent,
        "medication-dosage",
        "I cannot recommend medication dosages or changes. Please follow your prescription label and contact your doctor or pharmacist for dosage guidance.",
      ),
    };
  }

  if (isSafeHealthDataQuestion(normalized)) {
    return { safe: true };
  }

  if (
    includesAny(normalized, [
      /\bdiagnose\b/,
      /\bdo i have\b/,
      /\bwhat disease\b/,
      /\bam i sick\b/,
      /\bis this cancer\b/,
      /\btell me what condition\b/,
    ])
  ) {
    return {
      safe: false,
      category: "diagnosis",
      response: createSafetyResponse(
        intent,
        "diagnosis",
        "I cannot diagnose symptoms or medical conditions. I can share general wellness education, but a qualified clinician should evaluate symptoms and give medical advice.",
      ),
    };
  }

  return { safe: true };
}

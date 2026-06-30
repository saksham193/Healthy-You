import type { AIIntent } from "../../types";

export type IntentDomain = "nutrition" | "fitness" | "sleep" | "medication" | "hydration" | "general";

const intentKeywords: Record<IntentDomain, string[]> = {
  nutrition: ["eat", "food", "meal", "diet", "protein", "calorie", "snack", "vegetable"],
  fitness: ["workout", "exercise", "fitness", "steps", "walk", "training", "activity"],
  sleep: ["sleep", "tired", "energy", "rest", "fatigue", "bedtime", "recovery"],
  medication: ["medicine", "medication", "pill", "dose", "dosage", "reminder", "missed"],
  hydration: ["water", "hydration", "hydrate", "thirsty", "drink"],
  general: [],
};

const matches = (message: string, patterns: RegExp[]): boolean =>
  patterns.some((pattern) => pattern.test(message));

export function getIntentDomain(intent: AIIntent): IntentDomain {
  if (intent === "steps_query" || intent === "heart_rate_query" || intent === "activity_query") {
    return "fitness";
  }

  if (intent === "sleep_query") return "sleep";
  if (intent === "calories_query") return "fitness";
  if (intent === "hydration_query") return "hydration";
  if (intent === "device_sync_query") return "general";
  if (intent === "health_score_query") return "general";
  if (intent === "daily_briefing") return "general";
  if (intent === "general_wellness") return "general";
  if (intent === "medical_safety") return "general";

  return intent;
}

export function classifyIntent(message: string): AIIntent {
  const normalized = message.toLowerCase();
  const dataQuestionPrefix = /\b(how many|how much|what is|what's|show|tell me|check|where am i|how is)\b/;

  if (matches(normalized, [/\b(diabetes|cancer|disease|condition)\b/, /\bdiagnose\b/, /\bstop my medication\b/, /\bwhat dose\b/])) {
    return "medical_safety";
  }

  if (matches(normalized, [/\bbriefing\b/, /\bhealth summary\b/, /\bdaily summary\b/, /\btoday'?s health summary\b/, /\bgive me today'?s health summary\b/, /\bwhat should i focus on today\b/, /\bhow did i do yesterday\b/, /\btop health insight\b/])) {
    return "daily_briefing";
  }

  if (matches(normalized, [/\bstep(s)?\b/, /\bwalked\b/]) && dataQuestionPrefix.test(normalized)) {
    return "steps_query";
  }

  if (matches(normalized, [/\bheart[-\s]?rate\b/, /\bpulse\b/]) && dataQuestionPrefix.test(normalized)) {
    return "heart_rate_query";
  }

  if (matches(normalized, [/\bsleep\b/, /\bslept\b/]) && dataQuestionPrefix.test(normalized)) {
    return "sleep_query";
  }

  if (matches(normalized, [/\bcalories?\b/, /\bburn(?:ed)?\b/]) && dataQuestionPrefix.test(normalized)) {
    return "calories_query";
  }

  if (matches(normalized, [/\bhydration\b/, /\bwater\b/, /\bdrink\b/]) && dataQuestionPrefix.test(normalized)) {
    return "hydration_query";
  }

  if (matches(normalized, [/\bactivity\b/, /\bfitness progress\b/, /\bprogress\b/]) && dataQuestionPrefix.test(normalized)) {
    return "activity_query";
  }

  if (matches(normalized, [/\bsync\b/, /\bconnected\b/, /\bhealth connect\b/, /\bdevice\b/, /\bpermission\b/])) {
    return "device_sync_query";
  }

  if (matches(normalized, [/\bhealth score\b/, /\boverall health\b/])) {
    return "health_score_query";
  }

  if (matches(normalized, [/\bwellness\b/, /\bhealthy\b/, /\broutine\b/, /\bhabit\b/])) {
    return "general_wellness";
  }

  const intents: IntentDomain[] = ["nutrition", "fitness", "sleep", "medication", "hydration"];

  return (
    intents.find((intent) =>
      intentKeywords[intent].some((keyword) => normalized.includes(keyword)),
    ) ?? "general"
  );
}

import type { OfflineIntent } from "./types";

const intentPatterns: Array<{ intent: OfflineIntent; patterns: RegExp[] }> = [
  {
    intent: "emergency",
    patterns: [
      /\bchest pain\b/i,
      /\b(can'?t|cannot)\s+breathe\b/i,
      /\bsevere breathing\b/i,
      /\bfaint(?:ed|ing)?\b/i,
      /\bstroke\b/i,
      /\bface droop/i,
      /\bslurred speech/i,
      /\bone side.*weak/i,
      /\bunconscious\b/i,
      /\boverdose\b/i,
    ],
  },
  {
    intent: "device_status",
    patterns: [
      /\b(sync|synced|wearable|watch|device|health connect|apple health|google fit|fitbit|permission|stale)\b/i,
    ],
  },
  {
    intent: "trend_summary",
    patterns: [/\btrend|progress|summary|pattern|last week|weekly|improving|declining\b/i],
  },
  {
    intent: "hydration",
    patterns: [/\bwater|hydration|hydrate|thirst|drink\b/i],
  },
  {
    intent: "sleep",
    patterns: [/\bsleep|slept|bedtime|tired|fatigue|insomnia|rest|nap|recovery\b/i],
  },
  {
    intent: "fitness",
    patterns: [/\bworkout|exercise|fitness|steps|walk|run|training|activity|heart rate\b/i],
  },
  {
    intent: "nutrition",
    patterns: [/\bfood|meal|diet|nutrition|protein|calorie|vegetarian|allergy|snack|eat\b/i],
  },
  {
    intent: "medication",
    patterns: [/\bmedicine|medication|pill|dose|dosage|missed|reminder|adherence\b/i],
  },
  {
    intent: "general_health",
    patterns: [/\bhealth|wellness|energy|routine|habit|goal\b/i],
  },
];

export class OfflineIntentClassifier {
  classify(message: string): OfflineIntent {
    const normalized = message.trim();

    if (!normalized) return "unknown";

    return (
      intentPatterns.find((item) =>
        item.patterns.some((pattern) => pattern.test(normalized)),
      )?.intent ?? "unknown"
    );
  }
}

export const offlineIntentClassifier = new OfflineIntentClassifier();

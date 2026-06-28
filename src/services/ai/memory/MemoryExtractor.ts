import type { ConversationMemoryItem } from "../../../types";
import type { MemoryCategory, MemoryInput } from "../types";

type ExtractionRule = {
  category: MemoryCategory;
  pattern: RegExp;
  normalize(match: RegExpMatchArray): string;
};

const rules: ExtractionRule[] = [
  {
    category: "dietary_preference",
    pattern: /\b(?:i am|i'm|im)\s+(vegetarian|vegan|pescatarian|gluten[-\s]?free|dairy[-\s]?free)\b/i,
    normalize: (match) => match[1],
  },
  {
    category: "dietary_preference",
    pattern: /\bi (?:prefer|avoid|do not eat|don't eat)\s+([a-z][a-z\s-]{2,40})/i,
    normalize: (match) => match[1],
  },
  {
    category: "goal",
    pattern: /\bi (?:want to|would like to|need to|am trying to|plan to)\s+([a-z][a-z\s-]{2,60})/i,
    normalize: (match) => match[1],
  },
  {
    category: "allergy",
    pattern: /\b(?:i am|i'm|im)\s+allergic to\s+([a-z][a-z\s,-]{2,60})/i,
    normalize: (match) => match[1],
  },
  {
    category: "health_concern",
    pattern: /\bi have\s+(diabetes|hypertension|asthma|pcos|thyroid|high blood pressure|low energy|back pain)\b/i,
    normalize: (match) => match[1],
  },
  {
    category: "medication_habit",
    pattern: /\bi (?:often |sometimes |usually )?(forget|miss|skip|take)\s+(?:my\s+)?(?:medicine|medication|pills|dose)/i,
    normalize: (match) => `${match[1]} medication`,
  },
  {
    category: "exercise_preference",
    pattern: /\bi (?:like|prefer|enjoy)\s+(walking|running|yoga|strength training|cardio|cycling|swimming|gym workouts)/i,
    normalize: (match) => match[1],
  },
  {
    category: "health_concern",
    pattern: /\bi sleep\s+(\d+(?:\.\d+)?)\s*(?:hours|hrs|h)\b/i,
    normalize: (match) => `sleeps ${match[1]} hours`,
  },
];

const cleanValue = (value: string): string => value.trim().replace(/[.?!]+$/, "");

export function extractMemoriesFromMessage(message: string): MemoryInput[] {
  return rules.reduce<MemoryInput[]>((memories, rule) => {
    const match = message.match(rule.pattern);

    if (!match) return memories;

    return [
      ...memories,
      {
        category: rule.category,
        value: cleanValue(rule.normalize(match)),
        sourceMessage: message,
        confidence: 0.82,
      },
    ];
  }, []);
}

export function extractMemoriesFromConversation(items: ConversationMemoryItem[]): MemoryInput[] {
  return items
    .filter((item) => item.role === "user")
    .flatMap((item) => extractMemoriesFromMessage(item.message));
}

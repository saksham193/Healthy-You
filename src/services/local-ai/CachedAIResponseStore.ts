import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuthStore } from "../../store/authStore";
import type { AIRequest, AIResponse } from "../../types";
import { offlineIntentClassifier } from "./OfflineIntentClassifier";
import type { CachedAIResponse, OfflineIntent, OfflineSafetyLevel } from "./types";

const CACHE_KEY = "healthy-you.local-ai.cached-responses";
const MAX_ITEMS = 40;
const MAX_GLOBAL_ITEMS = 120;
const MAX_SUMMARY_LENGTH = 700;
const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

const sensitivePatterns = [
  /\bdiagnos/i,
  /\bcancer\b/i,
  /\bstd\b/i,
  /\bsti\b/i,
  /\bpregnan/i,
  /\babortion\b/i,
  /\bcontracept/i,
  /\bsexual\b/i,
  /\bsex\b/i,
  /\bgenital\b/i,
  /\berectile\b/i,
  /\bmental health\b/i,
  /\bsuicid/i,
  /\bself[-\s]?harm/i,
  /\bkill myself\b/i,
  /\boverdose\b/i,
  /\bhow much\b.*\b(take|dose|dosage|mg|medicine|medication|pill)\b/i,
  /\bwhat dose\b/i,
  /\bchange my dose\b/i,
  /\bincrease my medication\b/i,
  /\bdecrease my medication\b/i,
  /\bdouble\s+(?:my\s+)?dose\b/i,
  /\bpassword\b/i,
  /\baccess token\b/i,
  /\brefresh token\b/i,
  /\bsession\b/i,
  /\bauthorization\b/i,
  /\bbearer\b/i,
  /\bapi key\b/i,
];

const normalizeTopic = (message: string): string =>
  message
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2)
    .slice(0, 8)
    .join(" ");

const summarize = (response: string): string =>
  response.length <= MAX_SUMMARY_LENGTH
    ? response
    : `${response.slice(0, MAX_SUMMARY_LENGTH - 3).trim()}...`;

const getUserScope = (): string => {
  const user = useAuthStore.getState().user as { id?: string; email?: string } | null;

  return user?.id ?? user?.email ?? "local";
};

const isSensitive = (text: string): boolean => sensitivePatterns.some((pattern) => pattern.test(text));

const safetyFromResponse = (response: AIResponse): OfflineSafetyLevel => {
  const safetyLevel = response.metadata?.safetyLevel;

  if (safetyLevel === "urgent" || safetyLevel === "caution" || safetyLevel === "limited") return safetyLevel;
  if (safetyLevel === "out_of_scope") return "caution";

  return "routine";
};

const isExpired = (record: CachedAIResponse, now = Date.now()): boolean => {
  const timestamp = new Date(record.timestamp).getTime();

  return !Number.isFinite(timestamp) || now - timestamp > MAX_AGE_MS;
};

const pruneRecords = (records: CachedAIResponse[], activeUserScope: string): CachedAIResponse[] => {
  const fresh = records.filter((record) => !isExpired(record));
  const active = fresh
    .filter((record) => record.userScope === activeUserScope || record.userScope === "local")
    .sort((left, right) => right.timestamp.localeCompare(left.timestamp))
    .slice(0, MAX_ITEMS);
  const other = fresh
    .filter((record) => record.userScope !== activeUserScope && record.userScope !== "local")
    .sort((left, right) => right.timestamp.localeCompare(left.timestamp));

  return [...active, ...other].slice(0, MAX_GLOBAL_ITEMS);
};

export class CachedAIResponseStore {
  async cacheResponse(request: AIRequest, response: AIResponse): Promise<void> {
    if (response.provider === "mock") return;

    const offlineIntent = offlineIntentClassifier.classify(request.message);

    if (offlineIntent === "emergency") return;
    if (safetyFromResponse(response) === "urgent") return;
    if (isSensitive(`${request.message} ${response.response}`)) return;

    const records = await this.read();
    const userScope = getUserScope();
    const normalizedTopic = normalizeTopic(request.message);
    const nextRecord: CachedAIResponse = {
      id: `${userScope}-${offlineIntent}-${normalizedTopic || "general"}`,
      userScope,
      intent: offlineIntent,
      normalizedTopic,
      responseSummary: summarize(response.response),
      timestamp: new Date().toISOString(),
      source: response.provider === "offline" ? "offline" : "openai",
      safetyLevel: safetyFromResponse(response),
    };
    const merged = [
      nextRecord,
      ...records.filter((record) => record.id !== nextRecord.id),
    ];

    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(pruneRecords(merged, userScope)));
  }

  async search(intent: OfflineIntent, topic: string, limit = 2): Promise<CachedAIResponse[]> {
    const userScope = getUserScope();
    const normalizedTopic = normalizeTopic(topic);
    const topicTokens = normalizedTopic.split(/\s+/).filter(Boolean);
    const records = pruneRecords(await this.read(), userScope);

    return records
      .filter((record) => record.userScope === userScope || record.userScope === "local")
      .filter((record) => record.intent === intent || intent === "unknown" || record.intent === "general_health")
      .map((record) => {
        const haystack = record.normalizedTopic;
        const score = topicTokens.filter((token) => haystack.includes(token)).length;

        return { record, score };
      })
      .filter((item) => item.score > 0 || item.record.intent === intent)
      .sort((left, right) => right.score - left.score || right.record.timestamp.localeCompare(left.record.timestamp))
      .map((item) => item.record)
      .slice(0, limit);
  }

  async clear(): Promise<void> {
    await AsyncStorage.removeItem(CACHE_KEY);
  }

  async getCacheSize(): Promise<number> {
    const userScope = getUserScope();

    return pruneRecords(await this.read(), userScope).length;
  }

  private async read(): Promise<CachedAIResponse[]> {
    const raw = await AsyncStorage.getItem(CACHE_KEY);

    if (!raw) return [];

    try {
      const parsed: unknown = JSON.parse(raw);

      return Array.isArray(parsed)
        ? parsed.filter((item): item is CachedAIResponse =>
            typeof item === "object" &&
            item !== null &&
            typeof (item as CachedAIResponse).id === "string" &&
            typeof (item as CachedAIResponse).intent === "string" &&
            typeof (item as CachedAIResponse).responseSummary === "string",
          )
        : [];
    } catch {
      return [];
    }
  }
}

export const cachedAIResponseStore = new CachedAIResponseStore();

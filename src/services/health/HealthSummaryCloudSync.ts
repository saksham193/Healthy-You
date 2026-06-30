import AsyncStorage from "@react-native-async-storage/async-storage";
import type {
  FitnessData,
  HealthBackupStatus,
  HealthScore,
  HealthSummaryBackup,
  NutritionData,
  ScheduleData,
  SleepData,
} from "../../types";
import { fetchHealthSummaries, saveHealthSummary } from "../api/HealthSummaryApi";
import { connectivityService } from "../connectivity/ConnectivityService";
import type { DeviceHealthMetrics } from "../device/providers/DeviceProvider";
import { getStoredTokens } from "../secure/TokenStorage";

const LOCAL_SUMMARIES_KEY = "healthy-you.health-summary.local";
const HEALTH_SUMMARY_QUEUE_KEY = "healthy-you.health-summary.backup-queue";
const QUEUE_LIMIT = 14;
const LOCAL_LIMIT = 30;

type QueuedHealthSummaryBackup = {
  summary: HealthSummaryBackup;
  updatedAt: string;
  attemptCount: number;
  queuedAt: string;
};

export type HealthSummarySyncOutcome = {
  status: HealthBackupStatus;
  summaries: HealthSummaryBackup[];
  latestSummary: HealthSummaryBackup | null;
  queuedCount: number;
  error?: string;
};

type HealthSummaryBuildInput = {
  healthScore: HealthScore | null;
  fitness: FitnessData | null;
  nutrition: NutritionData | null;
  sleep: SleepData | null;
  schedule: ScheduleData | null;
  deviceMetrics?: DeviceHealthMetrics | null;
  lastHealthSyncAt: string | null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const getNumber = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

const today = (): string => new Date().toISOString().slice(0, 10);

const getTime = (value: string | undefined): number => {
  const parsed = value ? Date.parse(value) : Number.NaN;

  return Number.isNaN(parsed) ? 0 : parsed;
};

const summaryKey = (summary: Pick<HealthSummaryBackup, "date" | "summaryType">): string =>
  `${summary.date}:${summary.summaryType}`;

const sourceFromProvider = (providerId: string | undefined): HealthSummaryBackup["source"] => {
  if (providerId === "health-connect") return "health_connect";
  if (providerId === "apple-health") return "apple_health";
  if (providerId === "mock-health") return "mock_health";

  return "manual";
};

const sanitizeSummary = (summary: HealthSummaryBackup, forceCloudDisplay = false): HealthSummaryBackup => {
  const displaySource = forceCloudDisplay
    ? "Cloud Summary"
    : summary.displaySource;

  return {
    id: summary.id,
    date: summary.date,
    source: forceCloudDisplay ? "cloud_summary" : summary.source,
    deviceSource: forceCloudDisplay ? "cloud_summary" : summary.deviceSource,
    displaySource,
    summaryType: "daily",
    metrics: {
      steps: getNumber(summary.metrics.steps),
      caloriesBurned: getNumber(summary.metrics.caloriesBurned),
      activeMinutes: getNumber(summary.metrics.activeMinutes),
      sleepMinutes: getNumber(summary.metrics.sleepMinutes),
      hydrationMl: getNumber(summary.metrics.hydrationMl),
      heartRateAvg: getNumber(summary.metrics.heartRateAvg),
    },
    scores: {
      healthScore: getNumber(summary.scores.healthScore),
      sleepScore: getNumber(summary.scores.sleepScore),
      fitnessScore: getNumber(summary.scores.fitnessScore),
    },
    syncMetadata: {
      lastDeviceSyncAt: summary.syncMetadata.lastDeviceSyncAt ?? null,
      provider: forceCloudDisplay ? "cloud_summary" : summary.syncMetadata.provider,
      status: forceCloudDisplay ? "cloud_summary" : summary.syncMetadata.status,
    },
    updatedAt: summary.updatedAt,
  };
};

const normalizeSummary = (value: unknown, forceCloudDisplay = false): HealthSummaryBackup | null => {
  if (!isRecord(value) || !isRecord(value.metrics) || !isRecord(value.scores) || !isRecord(value.syncMetadata)) {
    return null;
  }

  const summary: HealthSummaryBackup = {
    id: typeof value.id === "string" ? value.id : `summary_${today()}_daily`,
    date: typeof value.date === "string" ? value.date : today(),
    source: typeof value.source === "string" ? value.source as HealthSummaryBackup["source"] : "manual",
    deviceSource: typeof value.deviceSource === "string"
      ? value.deviceSource as HealthSummaryBackup["deviceSource"]
      : "unavailable",
    displaySource: typeof value.displaySource === "string"
      ? value.displaySource as HealthSummaryBackup["displaySource"]
      : "Historical summary",
    summaryType: "daily",
    metrics: {
      steps: getNumber(value.metrics.steps),
      caloriesBurned: getNumber(value.metrics.caloriesBurned),
      activeMinutes: getNumber(value.metrics.activeMinutes),
      sleepMinutes: getNumber(value.metrics.sleepMinutes),
      hydrationMl: getNumber(value.metrics.hydrationMl),
      heartRateAvg: getNumber(value.metrics.heartRateAvg),
    },
    scores: {
      healthScore: getNumber(value.scores.healthScore),
      sleepScore: getNumber(value.scores.sleepScore),
      fitnessScore: getNumber(value.scores.fitnessScore),
    },
    syncMetadata: {
      lastDeviceSyncAt: typeof value.syncMetadata.lastDeviceSyncAt === "string"
        ? value.syncMetadata.lastDeviceSyncAt
        : null,
      provider: typeof value.syncMetadata.provider === "string"
        ? value.syncMetadata.provider as HealthSummaryBackup["syncMetadata"]["provider"]
        : undefined,
      status: typeof value.syncMetadata.status === "string"
        ? value.syncMetadata.status as HealthSummaryBackup["syncMetadata"]["status"]
        : "unavailable",
    },
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : new Date().toISOString(),
  };

  return sanitizeSummary(summary, forceCloudDisplay);
};

const sortSummaries = (summaries: HealthSummaryBackup[]): HealthSummaryBackup[] =>
  [...summaries].sort((left, right) => right.date.localeCompare(left.date) || right.updatedAt.localeCompare(left.updatedAt));

const mergeWithCloudPrecedence = (
  localSummaries: HealthSummaryBackup[],
  cloudSummaries: HealthSummaryBackup[],
): HealthSummaryBackup[] => {
  const cloudKeys = new Set(cloudSummaries.map(summaryKey));

  return sortSummaries([
    ...localSummaries.filter((summary) => !cloudKeys.has(summaryKey(summary))),
    ...cloudSummaries,
  ]).slice(0, LOCAL_LIMIT);
};

export const mergeLocalAndRemoteHealthSummaries = (
  localSummaries: HealthSummaryBackup[],
  remoteSummaries: HealthSummaryBackup[],
): HealthSummaryBackup[] => {
  const byKey = new Map<string, HealthSummaryBackup>();

  for (const summary of [...localSummaries, ...remoteSummaries]) {
    const existing = byKey.get(summaryKey(summary));

    if (!existing || summary.updatedAt.localeCompare(existing.updatedAt) >= 0) {
      byKey.set(summaryKey(summary), summary);
    }
  }

  return sortSummaries(Array.from(byKey.values())).slice(0, LOCAL_LIMIT);
};

export const buildHealthSummaryBackup = (input: HealthSummaryBuildInput): HealthSummaryBackup | null => {
  const date = today();
  const updatedAt = new Date().toISOString();
  const deviceSource = input.deviceMetrics?.source ?? "unavailable";
  const deviceStatus = deviceSource === "live" || deviceSource === "cache" || deviceSource === "fallback" || deviceSource === "no_data"
    ? deviceSource
    : "unavailable";

  if (!input.healthScore && !input.fitness && !input.nutrition && !input.sleep && !input.deviceMetrics) return null;

  return sanitizeSummary({
    id: `summary_${date}_daily`,
    date,
    source: sourceFromProvider(input.deviceMetrics?.providerId),
    deviceSource,
    displaySource: deviceSource === "live" ? "Live Device Summary" : "Last synced summary",
    summaryType: "daily",
    metrics: {
      steps: input.deviceMetrics?.steps ?? input.fitness?.summary.steps,
      caloriesBurned: input.deviceMetrics?.caloriesKcal ?? input.fitness?.summary.caloriesBurned,
      activeMinutes: input.deviceMetrics?.exerciseMinutes ?? input.fitness?.weeklyActivity.at(-1)?.minutes,
      sleepMinutes: input.deviceMetrics?.sleepMinutes ?? (
        input.sleep?.schedule.plannedHours ? Math.round(input.sleep.schedule.plannedHours * 60) : undefined
      ),
      hydrationMl: input.deviceMetrics?.hydrationMl ?? (
        input.nutrition?.summary.waterGlasses ? input.nutrition.summary.waterGlasses * 250 : undefined
      ),
      heartRateAvg: input.deviceMetrics?.heartRateBpm,
    },
    scores: {
      healthScore: input.healthScore?.score,
      sleepScore: input.sleep?.schedule.progressPercent,
      fitnessScore: input.fitness?.summary.score,
    },
    syncMetadata: {
      lastDeviceSyncAt: input.deviceMetrics?.syncedAt ?? input.lastHealthSyncAt,
      provider: input.deviceMetrics?.providerName,
      status: deviceStatus,
    },
    updatedAt,
  });
};

const getCachedSummaries = async (): Promise<HealthSummaryBackup[]> => {
  const raw = await AsyncStorage.getItem(LOCAL_SUMMARIES_KEY);

  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;

    return Array.isArray(parsed)
      ? sortSummaries(parsed.map((item) => normalizeSummary(item)).filter((item): item is HealthSummaryBackup => Boolean(item)))
      : [];
  } catch {
    return [];
  }
};

const saveCachedSummaries = async (summaries: HealthSummaryBackup[]): Promise<void> => {
  await AsyncStorage.setItem(LOCAL_SUMMARIES_KEY, JSON.stringify(sortSummaries(summaries).slice(0, LOCAL_LIMIT)));
};

const getQueuedBackups = async (): Promise<QueuedHealthSummaryBackup[]> => {
  const raw = await AsyncStorage.getItem(HEALTH_SUMMARY_QUEUE_KEY);

  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => {
        if (!isRecord(item)) return null;
        const summary = normalizeSummary(item.summary);

        if (!summary) return null;

        return {
          summary,
          updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : summary.updatedAt,
          attemptCount: getNumber(item.attemptCount) ?? 0,
          queuedAt: typeof item.queuedAt === "string" ? item.queuedAt : summary.updatedAt,
        };
      })
      .filter((item): item is QueuedHealthSummaryBackup => Boolean(item));
  } catch {
    await AsyncStorage.removeItem(HEALTH_SUMMARY_QUEUE_KEY);
    return [];
  }
};

const saveQueuedBackups = async (items: QueuedHealthSummaryBackup[]): Promise<void> => {
  const byKey = new Map<string, QueuedHealthSummaryBackup>();

  for (const item of items) {
    const existing = byKey.get(summaryKey(item.summary));

    if (!existing || getTime(item.updatedAt) >= getTime(existing.updatedAt)) {
      byKey.set(summaryKey(item.summary), item);
    }
  }

  const capped = Array.from(byKey.values())
    .sort((left, right) => getTime(right.updatedAt) - getTime(left.updatedAt))
    .slice(0, QUEUE_LIMIT);

  await AsyncStorage.setItem(HEALTH_SUMMARY_QUEUE_KEY, JSON.stringify(capped));
};

const toOutcome = async (
  status: HealthBackupStatus,
  summaries: HealthSummaryBackup[],
  error?: string,
): Promise<HealthSummarySyncOutcome> => {
  const queue = await getQueuedBackups();
  const sorted = sortSummaries(summaries);

  return {
    status,
    summaries: sorted,
    latestSummary: sorted[0] ?? null,
    queuedCount: queue.length,
    error,
  };
};

export async function queueHealthSummaryBackup(summary: HealthSummaryBackup): Promise<number> {
  const cleanSummary = sanitizeSummary(summary);
  const queue = await getQueuedBackups();

  await saveCachedSummaries(mergeLocalAndRemoteHealthSummaries(await getCachedSummaries(), [cleanSummary]));
  await saveQueuedBackups([
    {
      summary: cleanSummary,
      updatedAt: cleanSummary.updatedAt,
      attemptCount: 0,
      queuedAt: new Date().toISOString(),
    },
    ...queue,
  ]);

  return (await getQueuedBackups()).length;
}

export async function flushQueuedHealthSummaryBackups(): Promise<HealthSummarySyncOutcome> {
  const tokens = await getStoredTokens();
  const cached = await getCachedSummaries();
  const queue = await getQueuedBackups();

  if (!tokens || queue.length === 0 || !(await connectivityService.isOnline())) {
    return toOutcome(queue.length > 0 ? "pending" : "idle", cached);
  }

  const remaining: QueuedHealthSummaryBackup[] = [];
  let summaries = cached;

  for (const item of queue) {
    try {
      const saved = await saveHealthSummary(item.summary);
      const normalized = normalizeSummary(saved);

      if (normalized) {
        summaries = mergeLocalAndRemoteHealthSummaries(summaries, [normalized]);
      }
    } catch {
      remaining.push({
        ...item,
        attemptCount: item.attemptCount + 1,
      });
    }
  }

  await saveQueuedBackups(remaining);
  await saveCachedSummaries(summaries);

  return toOutcome(remaining.length > 0 ? "pending" : "synced", summaries);
}

export async function backupHealthSummaryToCloud(summary: HealthSummaryBackup): Promise<HealthSummarySyncOutcome> {
  const cleanSummary = sanitizeSummary(summary);
  const cached = mergeLocalAndRemoteHealthSummaries(await getCachedSummaries(), [cleanSummary]);

  await saveCachedSummaries(cached);

  const tokens = await getStoredTokens();

  if (!tokens) {
    return toOutcome("idle", cached);
  }

  if (!(await connectivityService.isOnline())) {
    await queueHealthSummaryBackup(cleanSummary);
    return toOutcome("offline", cached);
  }

  await flushQueuedHealthSummaryBackups();

  try {
    const saved = await saveHealthSummary(cleanSummary);
    const normalized = normalizeSummary(saved);
    const summaries = normalized ? mergeLocalAndRemoteHealthSummaries(cached, [normalized]) : cached;

    await saveCachedSummaries(summaries);

    return toOutcome("synced", summaries);
  } catch (error) {
    await queueHealthSummaryBackup(cleanSummary);

    return toOutcome("pending", cached, error instanceof Error ? error.message : "Health summary backup failed.");
  }
}

export async function loadHealthSummariesFromCloud(): Promise<HealthSummarySyncOutcome> {
  const cached = await getCachedSummaries();
  const tokens = await getStoredTokens();

  if (!tokens) {
    return toOutcome("idle", cached);
  }

  if (!(await connectivityService.isOnline())) {
    return toOutcome("offline", cached);
  }

  const flushed = await flushQueuedHealthSummaryBackups();

  try {
    const remote = await fetchHealthSummaries();
    const cloudSummaries = remote
      .map((item) => normalizeSummary(item, true))
      .filter((item): item is HealthSummaryBackup => Boolean(item));
    const merged = mergeWithCloudPrecedence(flushed.summaries, cloudSummaries);

    await saveCachedSummaries(merged);

    return toOutcome(flushed.queuedCount > 0 ? "pending" : "synced", merged);
  } catch (error) {
    return toOutcome(
      "failed",
      cached,
      error instanceof Error ? error.message : "Unable to load health summary backups.",
    );
  }
}

export async function clearHealthSummaryBackupQueue(): Promise<void> {
  await AsyncStorage.removeItem(HEALTH_SUMMARY_QUEUE_KEY);
}

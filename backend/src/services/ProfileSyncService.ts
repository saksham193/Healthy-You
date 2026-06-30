import { HealthProfileRepository } from "../repositories/HealthProfileRepository";
import type { HealthProfileRecord, HealthProfileSyncResponse } from "../types/api";

const toResponse = (record: HealthProfileRecord): HealthProfileSyncResponse => {
  let profile: Record<string, unknown> = {};

  try {
    const parsed = JSON.parse(record.profileJson) as unknown;

    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      profile = parsed as Record<string, unknown>;
    }
  } catch {
    profile = {};
  }

  return {
    ...record,
    profile,
  };
};

export class ProfileSyncService {
  constructor(private readonly profiles = new HealthProfileRepository()) {}

  get(userId: string): HealthProfileSyncResponse | null {
    const record = this.profiles.get(userId);

    return record ? toResponse(record) : null;
  }

  sync(userId: string, profile: Record<string, unknown>, updatedAt: string): HealthProfileSyncResponse {
    return toResponse(this.profiles.upsert({
      userId,
      profileJson: JSON.stringify({
        ...profile,
        updatedAt,
      }),
      updatedAt,
    }));
  }
}

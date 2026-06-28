import { HealthProfileRepository } from "../repositories/HealthProfileRepository";
import type { HealthProfileRecord } from "../types/api";

export class ProfileSyncService {
  constructor(private readonly profiles = new HealthProfileRepository()) {}

  get(userId: string): HealthProfileRecord | null {
    return this.profiles.get(userId);
  }

  sync(userId: string, profile: Record<string, unknown>, updatedAt: string): HealthProfileRecord {
    return this.profiles.upsert({
      userId,
      profileJson: JSON.stringify(profile),
      updatedAt,
    });
  }
}

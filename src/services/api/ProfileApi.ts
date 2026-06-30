import type { PersonalHealthProfile } from "../../types";
import { apiClient } from "./ApiClient";

type ProfileSyncResponse = {
  userId: string;
  profile?: PersonalHealthProfile;
  profileJson: string;
  updatedAt: string;
};

export async function fetchProfile(): Promise<ProfileSyncResponse | null> {
  return apiClient.get<ProfileSyncResponse | null>("/profile", { authenticated: true });
}

export async function syncProfile(profile: PersonalHealthProfile): Promise<ProfileSyncResponse> {
  return apiClient.put<ProfileSyncResponse>("/profile", {
    profile,
    updatedAt: profile.updatedAt,
  }, { authenticated: true });
}

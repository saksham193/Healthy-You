export type ApiSuccess<T> = {
  data: T;
};

export type ApiFailure = {
  error: {
    code: string;
    message: string;
  };
};

export type User = {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type AuthResponse = {
  user: User;
  tokens: AuthTokens;
};

export type MemoryRecord = {
  id: string;
  category: string;
  value: string;
  sourceMessage: string;
  confidence: number;
  createdAt: string;
  updatedAt: string;
  content?: string;
  summary?: string;
  type?: string;
  source?: string;
  importance?: number;
  metadata?: Record<string, unknown>;
  embedding?: number[] | null;
};

export type HealthProfileRecord = {
  userId: string;
  profileJson: string;
  updatedAt: string;
};

export type HealthProfileSyncResponse = {
  userId: string;
  profile: Record<string, unknown>;
  profileJson: string;
  updatedAt: string;
};

export type HealthSummaryRecord = {
  id: string;
  userId: string;
  date: string;
  source: string;
  deviceSource: string;
  displaySource: string;
  summaryType: string;
  metrics: Record<string, number>;
  scores: Record<string, number>;
  syncMetadata: Record<string, unknown>;
  updatedAt: string;
};

export type InsightRecord = {
  id: string;
  userId: string;
  payloadJson: string;
  createdAt: string;
};

export type AuthenticatedRequestContext = {
  userId: string;
  email: string;
};

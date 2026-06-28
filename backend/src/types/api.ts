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
};

export type HealthProfileRecord = {
  userId: string;
  profileJson: string;
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

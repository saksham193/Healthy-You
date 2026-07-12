export type STTProviderName = "mock" | "vosk" | "whisper_cpp" | "openai_whisper";

export type STTTranscriptionRequest = {
  audio: Buffer;
  mimeType: string;
  durationSeconds?: number;
  requestId?: string;
};

export type STTTranscriptionResponse = {
  transcript: string;
  provider: STTProviderName;
  model?: string;
  fallbackUsed: boolean;
  safetyNotice: string;
};

export interface STTProvider {
  readonly name: STTProviderName;
  readonly model?: string;
  isConfigured(): boolean;
  checkAvailability(): Promise<boolean>;
  transcribe(request: STTTranscriptionRequest): Promise<STTTranscriptionResponse>;
}

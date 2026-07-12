import type { STTProvider, STTTranscriptionRequest, STTTranscriptionResponse } from "./STTProvider";

export const TRANSCRIPT_REVIEW_NOTICE = "Review and edit the transcript before sending it to Medibot.";

export class MockSTTProvider implements STTProvider {
  readonly name = "mock" as const;
  readonly model = "safe-demo-stt";

  isConfigured(): boolean {
    return true;
  }

  async checkAvailability(): Promise<boolean> {
    return true;
  }

  async transcribe(_request: STTTranscriptionRequest): Promise<STTTranscriptionResponse> {
    return {
      transcript:
        "This is a demo transcript because no speech-to-text provider is configured. Please edit this text before sending it to Medibot.",
      provider: this.name,
      model: this.model,
      fallbackUsed: true,
      safetyNotice: TRANSCRIPT_REVIEW_NOTICE,
    };
  }
}

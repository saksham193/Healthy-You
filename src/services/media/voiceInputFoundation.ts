export type VoiceInputFoundationStatus = {
  available: false;
  title: string;
  message: string;
};

export const getVoiceInputFoundationStatus = (): VoiceInputFoundationStatus => ({
  available: false,
  title: "Voice transcription deferred",
  message:
    "Healthy You has not enabled a validated speech-to-text package or secure transcription endpoint yet. Please type your Medibot message for now.",
});

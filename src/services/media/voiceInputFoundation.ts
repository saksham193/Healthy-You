export type VoiceInputFoundationStatus = {
  available: false;
  state: "unavailable";
  title: string;
  message: string;
  safetyNote: string;
};

export const getVoiceInputFoundationStatus = (): VoiceInputFoundationStatus => ({
  available: false,
  state: "unavailable",
  title: "Voice input",
  message:
    "Voice input is not available in this build. You can continue typing your message.",
  safetyNote:
    "Healthy You will not record audio, upload audio, or send a transcript automatically.",
});

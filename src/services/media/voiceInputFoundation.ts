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
    "Voice recording is unavailable in this RC2 build. You can still type your message to Medibot.",
  safetyNote:
    "Healthy You will not request microphone permission, record audio, upload audio, or send a transcript automatically.",
});

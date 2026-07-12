export const VOICE_RECORDING_MAX_DURATION_SECONDS = 30;
export const VOICE_RECORDING_MIME_TYPE = "audio/mp4";

export type VoiceRecordingPermissionResult = {
  granted: boolean;
  canAskAgain?: boolean;
  unavailableReason?: string;
};

export type VoiceRecordingClip = {
  uri: string;
  mimeType: string;
  durationSeconds: number;
};

const unavailableReason =
  "Voice recording is unavailable on this build/device. You can still type your message to Medibot.";

export async function requestVoiceRecordingPermission(): Promise<VoiceRecordingPermissionResult> {
  return {
    granted: false,
    canAskAgain: false,
    unavailableReason,
  };
}

export async function startVoiceRecording(): Promise<void> {
  throw new Error("voice_recording_unavailable");
}

export async function stopVoiceRecording(): Promise<VoiceRecordingClip> {
  throw new Error("voice_recording_unavailable");
}

export async function cancelActiveVoiceRecording(): Promise<void> {
  return undefined;
}

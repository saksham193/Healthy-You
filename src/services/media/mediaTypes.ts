export type FoodScanImageSource = "camera" | "library";

export type FoodScanImageDraft = {
  uri: string;
  fileName: string;
  mimeType?: string;
  fileSize?: number;
  width?: number;
  height?: number;
  source: FoodScanImageSource;
  capturedAt: string;
};

export type PickedAttachment = {
  name: string;
  uri: string;
  mimeType: string;
  size?: number;
  selectedAt: string;
};

export type MediaPickerResult<T> =
  | { ok: true; asset: T }
  | { ok: false; reason: "cancelled" | "permission-denied" | "unsupported" | "too-large" | "unavailable" | "error"; message: string };

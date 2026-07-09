import * as DocumentPicker from "expo-document-picker";
import type { MediaPickerResult, PickedAttachment } from "./mediaTypes";

const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
const ALLOWED_ATTACHMENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "text/plain",
];

const normalizeMimeType = (mimeType?: string): string => mimeType?.toLowerCase() ?? "application/octet-stream";

export const formatBytes = (size?: number): string => {
  if (!size || size <= 0) return "Unknown size";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

export const pickMedibotAttachment = async (): Promise<MediaPickerResult<PickedAttachment>> => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: false,
      multiple: false,
      type: ALLOWED_ATTACHMENT_TYPES,
    });

    if (result.canceled) {
      return { ok: false, reason: "cancelled", message: "Attachment selection was cancelled." };
    }

    const asset = result.assets[0];
    if (!asset) {
      return { ok: false, reason: "error", message: "Healthy You could not read the selected attachment." };
    }

    const mimeType = normalizeMimeType(asset.mimeType);
    if (!ALLOWED_ATTACHMENT_TYPES.includes(mimeType)) {
      return {
        ok: false,
        reason: "unsupported",
        message: "This file type is not supported in the beta attachment flow.",
      };
    }

    if (asset.size && asset.size > MAX_ATTACHMENT_BYTES) {
      return {
        ok: false,
        reason: "too-large",
        message: "This file is too large for the beta attachment flow. Please keep attachments under 5 MB.",
      };
    }

    return {
      ok: true,
      asset: {
        name: asset.name,
        uri: asset.uri,
        mimeType,
        size: asset.size,
        selectedAt: new Date().toISOString(),
      },
    };
  } catch {
    return {
      ok: false,
      reason: "error",
      message: "Healthy You could not open the document picker right now.",
    };
  }
};

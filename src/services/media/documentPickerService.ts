import * as DocumentPicker from "expo-document-picker";
import type { MediaPickerResult, PickedAttachment } from "./mediaTypes";

const MAX_TEXT_ATTACHMENT_BYTES = 1 * 1024 * 1024;
const MAX_PDF_ATTACHMENT_BYTES = 3 * 1024 * 1024;
const ALLOWED_ATTACHMENT_TYPES = [
  "application/pdf",
  "application/json",
  "application/octet-stream",
  "text/csv",
  "text/markdown",
  "text/plain",
];

const normalizeMimeType = (mimeType?: string): string => mimeType?.toLowerCase() ?? "application/octet-stream";
const getSafeExtensionMimeType = (fileName: string): string | null => {
  const extension = fileName.split(".").pop()?.trim().toLowerCase();

  switch (extension) {
    case "txt":
      return "text/plain";
    case "md":
    case "markdown":
      return "text/markdown";
    case "json":
      return "application/json";
    case "pdf":
      return "application/pdf";
    default:
      return null;
  }
};

const normalizeAttachmentMimeType = (mimeType: string, fileName: string): string =>
  mimeType === "application/octet-stream"
    ? getSafeExtensionMimeType(fileName) ?? mimeType
    : mimeType;

export const formatBytes = (size?: number): string => {
  if (!size || size <= 0) return "Unknown size";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

export const pickMedibotAttachment = async (): Promise<MediaPickerResult<PickedAttachment>> => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
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

    const mimeType = normalizeAttachmentMimeType(normalizeMimeType(asset.mimeType), asset.name);
    if (!ALLOWED_ATTACHMENT_TYPES.includes(mimeType)) {
      return {
        ok: false,
        reason: "unsupported",
        message: "This file type is not supported in the beta attachment flow.",
      };
    }

    const maxBytes = mimeType === "application/pdf" ? MAX_PDF_ATTACHMENT_BYTES : MAX_TEXT_ATTACHMENT_BYTES;

    if (asset.size && asset.size > maxBytes) {
      return {
        ok: false,
        reason: "too-large",
        message: mimeType === "application/pdf"
          ? "This PDF is too large for the beta attachment flow. Please keep PDFs under 3 MB."
          : "This file is too large for attachment analysis. Please keep text-like files under 1 MB.",
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

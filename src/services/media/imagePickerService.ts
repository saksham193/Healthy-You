import * as ImagePicker from "expo-image-picker";
import type { FoodScanImageDraft, FoodScanImageSource, MediaPickerResult } from "./mediaTypes";

const MAX_FOOD_SCAN_IMAGE_BYTES = 8 * 1024 * 1024;

const buildImageDraft = (
  asset: ImagePicker.ImagePickerAsset,
  source: FoodScanImageSource,
): FoodScanImageDraft => ({
  uri: asset.uri,
  fileName: asset.fileName ?? `healthy-you-food-scan-${Date.now()}.jpg`,
  mimeType: asset.mimeType,
  fileSize: asset.fileSize,
  width: asset.width,
  height: asset.height,
  source,
  capturedAt: new Date().toISOString(),
});

const validateImageAsset = (
  asset: ImagePicker.ImagePickerAsset,
  source: FoodScanImageSource,
): MediaPickerResult<FoodScanImageDraft> => {
  if (asset.type && asset.type !== "image") {
    return {
      ok: false,
      reason: "unsupported",
      message: "Healthy You can only use still food photos for this beta scan flow.",
    };
  }

  if (asset.fileSize && asset.fileSize > MAX_FOOD_SCAN_IMAGE_BYTES) {
    return {
      ok: false,
      reason: "too-large",
      message: "This image is too large for the beta scan flow. Try a smaller photo or log the meal manually.",
    };
  }

  return { ok: true, asset: buildImageDraft(asset, source) };
};

export const pickFoodPhotoFromLibrary = async (): Promise<MediaPickerResult<FoodScanImageDraft>> => {
  try {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync(false);
    if (!permission.granted) {
      return {
        ok: false,
        reason: "permission-denied",
        message: "Photo library access was not granted. You can still log the meal manually.",
      };
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      allowsMultipleSelection: false,
      base64: false,
      exif: false,
      mediaTypes: ["images"],
      quality: 0.82,
    });

    if (result.canceled) {
      return { ok: false, reason: "cancelled", message: "Photo selection was cancelled." };
    }

    const asset = result.assets[0];
    if (!asset) {
      return { ok: false, reason: "error", message: "Healthy You could not read the selected image." };
    }

    return validateImageAsset(asset, "library");
  } catch {
    return {
      ok: false,
      reason: "error",
      message: "Healthy You could not open the photo picker right now.",
    };
  }
};

export const captureFoodPhotoWithCamera = async (): Promise<MediaPickerResult<FoodScanImageDraft>> => {
  try {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      return {
        ok: false,
        reason: "permission-denied",
        message: "Camera access was not granted. You can still log the meal manually.",
      };
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      base64: false,
      exif: false,
      mediaTypes: ["images"],
      quality: 0.82,
    });

    if (result.canceled) {
      return { ok: false, reason: "cancelled", message: "Camera capture was cancelled." };
    }

    const asset = result.assets[0];
    if (!asset) {
      return { ok: false, reason: "error", message: "Healthy You could not read the captured image." };
    }

    return validateImageAsset(asset, "camera");
  } catch {
    return {
      ok: false,
      reason: "error",
      message: "Healthy You could not open the camera right now.",
    };
  }
};

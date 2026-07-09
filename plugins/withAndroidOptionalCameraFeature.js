const { withAndroidManifest } = require("@expo/config-plugins");

const CAMERA_FEATURE = "android.hardware.camera";

module.exports = function withAndroidOptionalCameraFeature(config) {
  return withAndroidManifest(config, (pluginConfig) => {
    const manifest = pluginConfig.modResults.manifest;

    if (!manifest["uses-feature"]) {
      manifest["uses-feature"] = [];
    }

    const existingFeature = manifest["uses-feature"].find(
      (feature) => feature.$?.["android:name"] === CAMERA_FEATURE,
    );

    if (existingFeature) {
      existingFeature.$["android:required"] = "false";
    } else {
      manifest["uses-feature"].push({
        $: {
          "android:name": CAMERA_FEATURE,
          "android:required": "false",
        },
      });
    }

    return pluginConfig;
  });
};

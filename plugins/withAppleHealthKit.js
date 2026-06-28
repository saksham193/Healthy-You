const { withEntitlementsPlist, withInfoPlist } = require("@expo/config-plugins");

const DEFAULT_HEALTH_SHARE_DESCRIPTION =
  "Healthy You reads Apple Health activity, sleep, hydration, vitals, and body metrics to personalize your wellness dashboard and Medibot guidance.";

module.exports = function withAppleHealthKit(config) {
  config = withInfoPlist(config, (pluginConfig) => {
    pluginConfig.modResults.NSHealthShareUsageDescription =
      pluginConfig.modResults.NSHealthShareUsageDescription || DEFAULT_HEALTH_SHARE_DESCRIPTION;

    return pluginConfig;
  });

  config = withEntitlementsPlist(config, (pluginConfig) => {
    pluginConfig.modResults["com.apple.developer.healthkit"] = true;

    return pluginConfig;
  });

  return config;
};


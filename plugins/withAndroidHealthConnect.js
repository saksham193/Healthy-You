const { withAndroidManifest } = require("@expo/config-plugins");

const HEALTH_CONNECT_PACKAGE = "com.google.android.apps.healthdata";

const hasHealthConnectQuery = (queries) =>
  queries.some((query) =>
    query.package?.some((item) => item.$?.["android:name"] === HEALTH_CONNECT_PACKAGE),
  );

module.exports = function withAndroidHealthConnect(config) {
  return withAndroidManifest(config, (pluginConfig) => {
    const manifest = pluginConfig.modResults.manifest;

    if (!manifest.queries) {
      manifest.queries = [];
    }

    if (!hasHealthConnectQuery(manifest.queries)) {
      manifest.queries.push({
        package: [
          {
            $: {
              "android:name": HEALTH_CONNECT_PACKAGE,
            },
          },
        ],
      });
    }

    return pluginConfig;
  });
};


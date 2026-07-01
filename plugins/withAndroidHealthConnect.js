const { withAndroidManifest } = require("@expo/config-plugins");

const HEALTH_CONNECT_PACKAGES = [
  "com.google.android.apps.healthdata",
  "com.google.android.healthconnect.controller",
];

const hasHealthConnectQuery = (queries, packageName) =>
  queries.some((query) =>
    query.package?.some((item) => item.$?.["android:name"] === packageName),
  );

module.exports = function withAndroidHealthConnect(config) {
  return withAndroidManifest(config, (pluginConfig) => {
    const manifest = pluginConfig.modResults.manifest;

    if (!manifest.queries) {
      manifest.queries = [];
    }

    for (const packageName of HEALTH_CONNECT_PACKAGES) {
      if (!hasHealthConnectQuery(manifest.queries, packageName)) {
        manifest.queries.push({
          package: [
            {
              $: {
                "android:name": packageName,
              },
            },
          ],
        });
      }
    }

    return pluginConfig;
  });
};

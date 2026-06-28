const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const contains = (relativePath, expected) => {
  const content = read(relativePath);

  assert(content.includes(expected), `${relativePath} is missing: ${expected}`);
};

const walk = (directory) => {
  const absoluteDirectory = path.join(root, directory);

  return fs.readdirSync(absoluteDirectory, { withFileTypes: true }).flatMap((entry) => {
    const relativePath = path.join(directory, entry.name);

    if (entry.isDirectory()) return walk(relativePath);
    return relativePath;
  });
};

const assertNoNativeImportsOutsideProviders = () => {
  const files = [
    ...walk("src/components"),
    ...walk("src/screens"),
    ...walk("src/hooks"),
  ].filter((file) => /\.(ts|tsx)$/.test(file));

  for (const file of files) {
    const content = read(file);

    assert(!content.includes("react-native-health"), `${file} imports HealthKit directly`);
    assert(!content.includes("react-native-health-connect"), `${file} imports Health Connect directly`);
  }
};

const validateDeviceContract = () => {
  contains("src/services/device/providers/DeviceProvider.ts", "sourcePlatform");
  contains("src/services/device/providers/DeviceProvider.ts", "permissionStatus");
  contains("src/services/device/providers/DeviceProvider.ts", "syncStatus");
  contains("src/services/device/providers/DeviceProvider.ts", "isStale");
};

const validateProviderSelection = () => {
  contains("src/services/devices/deviceService.ts", "Platform.OS === \"ios\"");
  contains("src/services/devices/deviceService.ts", "Platform.OS !== \"android\"");
  contains("src/services/devices/deviceService.ts", "throw new Error");
  contains("src/services/devices/deviceService.ts", "AppleHealthProvider");
  contains("src/services/devices/deviceService.ts", "HealthConnectProvider");
  contains("src/services/devices/deviceService.ts", "MockDeviceProvider");
};

const validateProviders = () => {
  contains("src/services/device/providers/AppleHealthPermissions.ts", "await import(\"react-native-health\")");
  contains("src/services/device/providers/HealthConnectPermissions.ts", "await import(\"react-native-health-connect\")");
  contains("src/services/device/providers/AppleHealthProvider.ts", "sourcePlatform: \"ios\"");
  contains("src/services/device/providers/HealthConnectProvider.ts", "sourcePlatform: \"android\"");
  contains("src/services/device/providers/MockDeviceProvider.ts", "source: \"fallback\"");
};

const validateCacheAndStore = () => {
  contains("src/services/device/HealthSyncManager.ts", "source: metrics.source === \"fallback\" ? \"fallback\" : \"cache\"");
  contains("src/services/device/HealthSyncManager.ts", "isStale: true");
  contains("src/store/healthStore.ts", "deviceDataSource");
  contains("src/store/healthStore.ts", "deviceDataStale");
};

const validateMapperAndAi = () => {
  contains("src/services/health/deviceHealthMapper.ts", "Updated from ${metrics.providerName}");
  contains("src/services/ai/healthContextBuilder.ts", "state.deviceDataSource");
  contains("src/services/ai/promptBuilder.ts", "Device Source:");
};

const validateConfig = () => {
  const appJson = JSON.parse(read("app.json"));
  const plugins = appJson.expo.plugins.map((plugin) => (Array.isArray(plugin) ? plugin[0] : plugin));
  const androidPermissions = appJson.expo.android.permissions;

  assert(plugins.includes("expo-health-connect"), "app.json is missing expo-health-connect plugin");
  assert(plugins.includes("./plugins/withAndroidHealthConnect"), "app.json is missing Android Health Connect local plugin");
  assert(plugins.includes("./plugins/withAppleHealthKit"), "app.json is missing Apple HealthKit local plugin");
  assert(androidPermissions.includes("android.permission.health.READ_STEPS"), "app.json is missing Health Connect steps permission");
  contains("plugins/withAppleHealthKit.js", "com.apple.developer.healthkit");
  contains("plugins/withAndroidHealthConnect.js", "com.google.android.apps.healthdata");
};

validateDeviceContract();
validateProviderSelection();
validateProviders();
validateCacheAndStore();
validateMapperAndAi();
validateConfig();
assertNoNativeImportsOutsideProviders();

console.log("Device layer validation passed.");


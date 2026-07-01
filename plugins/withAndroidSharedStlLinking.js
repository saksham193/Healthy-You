const { withProjectBuildGradle } = require("@expo/config-plugins");

const BLOCK_TAG = "healthy-you-shared-stl-linking";
const LINKER_FLAGS = "-lc++_shared";

const SHARED_STL_LINKING_BLOCK = `
// ${BLOCK_TAG}: keep RN/Expo native module C++ runtime symbols linked on Android.
subprojects { subproject ->
  subproject.plugins.withId("com.android.library") {
    subproject.android {
      defaultConfig {
        externalNativeBuild {
          cmake {
            arguments "-DCMAKE_SHARED_LINKER_FLAGS=${LINKER_FLAGS}",
                "-DCMAKE_EXE_LINKER_FLAGS=${LINKER_FLAGS}"
          }
        }
      }
    }
  }

  subproject.plugins.withId("com.android.application") {
    subproject.android {
      defaultConfig {
        externalNativeBuild {
          cmake {
            arguments "-DCMAKE_SHARED_LINKER_FLAGS=${LINKER_FLAGS}",
                "-DCMAKE_EXE_LINKER_FLAGS=${LINKER_FLAGS}"
          }
        }
      }
    }
  }
}
`;

module.exports = function withAndroidSharedStlLinking(config) {
  return withProjectBuildGradle(config, (pluginConfig) => {
    const contents = pluginConfig.modResults.contents;

    if (contents.includes(BLOCK_TAG)) {
      return pluginConfig;
    }

    const anchor = 'apply plugin: "expo-root-project"';
    const block = SHARED_STL_LINKING_BLOCK.trim();

    pluginConfig.modResults.contents = contents.includes(anchor)
      ? contents.replace(anchor, `${block}\n\n${anchor}`)
      : `${contents.trimEnd()}\n\n${block}\n`;

    return pluginConfig;
  });
};

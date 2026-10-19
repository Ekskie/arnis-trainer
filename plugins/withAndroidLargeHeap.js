const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Expo Config Plugin to ensure `android:largeHeap="true"` is always injected
 * into the <application> tag of AndroidManifest.xml during prebuild / EAS Build,
 * preventing OOM and crash on devices with <= 4 GB RAM.
 */
module.exports = function withAndroidLargeHeap(config) {
  return withAndroidManifest(config, (config) => {
    const mainApplication = config.modResults.manifest.application?.[0];
    if (mainApplication) {
      if (!mainApplication.$) {
        mainApplication.$ = {};
      }
      mainApplication.$['android:largeHeap'] = 'true';
    }
    return config;
  });
};

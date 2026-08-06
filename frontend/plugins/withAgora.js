const { withAndroidManifest, withInfoPlist } = require('@expo/config-plugins');

// Agora Video SDK requires these Android permissions in addition to the
// camera/mic/internet/network/bluetooth permissions already declared in
// app.json. The runtime permissions (CAMERA, RECORD_AUDIO) are still
// requested through expo-camera, so the manifest entries here are only the
// manifest-level declarations Agora's native SDK expects.
const AGORA_ANDROID_PERMISSIONS = [
  'android.permission.MODIFY_AUDIO_SETTINGS',
  'android.permission.ACCESS_WIFI_STATE',
  'android.permission.BLUETOOTH_ADMIN',
  'android.permission.BLUETOOTH_CONNECT',
  'android.permission.BLUETOOTH_SCAN',
  'android.permission.READ_PHONE_STATE',
];

const withAgoraAndroidPermissions = (config) => {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;

    // Camera is optional (audio-only devices should still be able to run)
    if (!Array.isArray(manifest['uses-feature'])) {
      manifest['uses-feature'] = [];
    }
    if (!manifest['uses-feature'].some(
      (f) => f.$ && f.$['android:name'] === 'android.hardware.camera'
    )) {
      manifest['uses-feature'].push({
        $: {
          'android:name': 'android.hardware.camera',
          'android:required': 'false',
        },
      });
    }

    if (!Array.isArray(manifest['uses-permission'])) {
      manifest['uses-permission'] = [];
    }
    const existing = manifest['uses-permission'].map(
      (p) => p.$ && p.$['android:name']
    );
    AGORA_ANDROID_PERMISSIONS.forEach((permission) => {
      if (!existing.includes(permission)) {
        manifest['uses-permission'].push({ $: { 'android:name': permission } });
      }
    });

    return config;
  });
};

const withAgoraIosPermissions = (config) => {
  return withInfoPlist(config, (config) => {
    // expo-camera usually adds these, but keep them here so Agora video
    // rendering never hits a missing usage-description crash on iOS.
    if (!config.modResults.NSCameraUsageDescription) {
      config.modResults.NSCameraUsageDescription =
        'Allow Mingo to access your camera for video calls.';
    }
    if (!config.modResults.NSMicrophoneUsageDescription) {
      config.modResults.NSMicrophoneUsageDescription =
        'Allow Mingo to access your microphone for audio and video calls.';
    }
    return config;
  });
};

const withAgora = (config) => {
  config = withAgoraAndroidPermissions(config);
  config = withAgoraIosPermissions(config);
  return config;
};

module.exports = withAgora;

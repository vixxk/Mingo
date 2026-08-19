const {
  withAndroidManifest,
  withMainApplication,
  withAndroidStyles,
  withDangerousMod,
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// Native classes registered by this plugin
const SERVICE_CLASS = 'app.themingo.notification.IncomingCallNotificationService';
const ACTIVITY_CLASS = '.IncomingCallActivity';
const MODULE_MARKER = 'add(app.themingo.IncomingCallPackage())';

// Kotlin sources shipped with the plugin — copied into the Android project at
// prebuild time so they survive `expo prebuild` regenerating the android/ dir.
const KOTLIN_SOURCE_DIR = path.join(__dirname, 'incoming-call', 'android');

// Bundled ringtone used by the native call card (copied to res/raw). It is the
// same asset the in-app popup already plays in the foreground.
const RINGTONE_SOURCE = path.join(__dirname, '..', 'assets', 'sounds', 'incoming-call.wav');

const REQUIRED_PERMISSIONS = [
  'android.permission.POST_NOTIFICATIONS',
  'android.permission.USE_FULL_SCREEN_INTENT',
  'android.permission.WAKE_LOCK',
];

const KOTLIN_FILES = [
  'IncomingCallNotifications.kt',
  'IncomingCallModule.kt',
  'IncomingCallPackage.kt',
  'IncomingCallActivity.kt',
];

const withIncomingCallManifest = (config) =>
  withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;

    // ── Permissions ──────────────────────────────────────────────
    if (!Array.isArray(manifest['uses-permission'])) {
      manifest['uses-permission'] = [];
    }
    const existingPerms = manifest['uses-permission'].map((p) => p.$ && p.$['android:name']);
    REQUIRED_PERMISSIONS.forEach((name) => {
      if (!existingPerms.includes(name)) {
        manifest['uses-permission'].push({ $: { 'android:name': name } });
      }
    });

    const app = Array.isArray(manifest.application) ? manifest.application[0] : null;
    if (!app) return config;

    // ── OneSignal Notification Service Extension registration ────
    if (!Array.isArray(app['meta-data'])) app['meta-data'] = [];
    const existingMeta = app['meta-data'].map((m) => m.$ && m.$['android:name']);
    if (!existingMeta.includes('com.onesignal.NotificationServiceExtension')) {
      app['meta-data'].push({
        $: {
          'android:name': 'com.onesignal.NotificationServiceExtension',
          'android:value': SERVICE_CLASS,
        },
      });
    }

    // ── Full-screen incoming-call activity ───────────────────────
    if (!Array.isArray(app.activity)) app.activity = [];
    const existingActivities = app.activity.map((a) => a.$ && a.$['android:name']);
    if (!existingActivities.includes(ACTIVITY_CLASS)) {
      app.activity.push({
        $: {
          'android:name': ACTIVITY_CLASS,
          'android:exported': 'false',
          'android:launchMode': 'singleTop',
          'android:theme': '@style/Theme.App.IncomingCall',
          'android:screenOrientation': 'portrait',
          'android:configChanges':
            'keyboard|keyboardHidden|orientation|screenSize|screenLayout|uiMode',
          'android:showWhenLocked': 'true',
          'android:turnScreenOn': 'true',
          'android:excludeFromRecents': 'true',
        },
      });
    }

    return config;
  });

const withIncomingCallMainApplication = (config) =>
  withMainApplication(config, (config) => {
    let contents = config.modResults.contents;
    if (contents.includes(MODULE_MARKER)) return config;

    const anchor = '// add(MyReactNativePackage())';
    if (contents.includes(anchor)) {
      contents = contents.replace(anchor, `${anchor}\n              ${MODULE_MARKER}`);
    } else {
      // Fallback: register right inside the packages apply block
      contents = contents.replace(
        'PackageList(this).packages.apply {',
        `PackageList(this).packages.apply {\n              ${MODULE_MARKER}`
      );
    }
    config.modResults.contents = contents;
    return config;
  });

const withIncomingCallStyles = (config) =>
  withAndroidStyles(config, (config) => {
    // modResults is the parsed styles.xml object: { resources: { style: [...] } }
    const xml = config.modResults;
    if (!Array.isArray(xml?.resources?.style)) {
      xml.resources = xml.resources || {};
      xml.resources.style = [];
    }
    const styles = xml.resources.style;
    if (styles.some((s) => s.$ && s.$.name === 'Theme.App.IncomingCall')) return config;
    styles.push({
      $: { name: 'Theme.App.IncomingCall', parent: 'android:Theme.Translucent.NoTitleBar' },
      item: [
        { $: { name: 'android:windowBackground' }, _: '@android:color/transparent' },
        { $: { name: 'android:windowIsTranslucent' }, _: 'true' },
        { $: { name: 'android:windowNoTitle' }, _: 'true' },
        { $: { name: 'android:statusBarColor' }, _: '@android:color/transparent' },
      ],
    });
    config.modResults = xml;
    return config;
  });

const withIncomingCallSources = (config) =>
  withDangerousMod(config, ['android', async (config) => {
    const platformRoot = config.modRequest.platformProjectRoot;
    const javaDir = path.join(platformRoot, 'app', 'src', 'main', 'java', 'app', 'themingo');
    const notifDir = path.join(javaDir, 'notification');
    const rawDir = path.join(platformRoot, 'app', 'src', 'main', 'res', 'raw');

    fs.mkdirSync(notifDir, { recursive: true });
    fs.mkdirSync(rawDir, { recursive: true });

    // Kotlin sources
    for (const file of KOTLIN_FILES) {
      const src = path.join(KOTLIN_SOURCE_DIR, file);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, path.join(javaDir, file));
      }
    }
    const serviceSrc = path.join(KOTLIN_SOURCE_DIR, 'notification', 'IncomingCallNotificationService.kt');
    if (fs.existsSync(serviceSrc)) {
      fs.copyFileSync(serviceSrc, path.join(notifDir, 'IncomingCallNotificationService.kt'));
    }

    // Ringtone resource
    if (fs.existsSync(RINGTONE_SOURCE)) {
      fs.copyFileSync(RINGTONE_SOURCE, path.join(rawDir, 'incoming_ringtone.wav'));
    }

    // Logo resource
    const LOGO_SOURCE = path.join(__dirname, '..', 'images', 'Mingo Splash Text.png');
    const drawableDir = path.join(platformRoot, 'app', 'src', 'main', 'res', 'drawable');
    if (!fs.existsSync(drawableDir)) fs.mkdirSync(drawableDir, { recursive: true });
    if (fs.existsSync(LOGO_SOURCE)) {
      fs.copyFileSync(LOGO_SOURCE, path.join(drawableDir, 'mingo_logo.png'));
    }

    return config;
  }]);

const withIncomingCall = (config) => {
  config = withIncomingCallManifest(config);
  config = withIncomingCallMainApplication(config);
  config = withIncomingCallStyles(config);
  config = withIncomingCallSources(config);
  return config;
};

module.exports = withIncomingCall;

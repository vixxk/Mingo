const { withProjectBuildGradle, withAppBuildGradle } = require('@expo/config-plugins');

const withZegoProjectBuildGradle = (config) => {
  return withProjectBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      let buildGradle = config.modResults.contents;
      
      if (!buildGradle.includes('storage.zego.im/maven')) {
        buildGradle = buildGradle.replace(
          /mavenCentral\(\)/g,
          `mavenCentral()\n        maven { url 'https://storage.zego.im/maven' }\n        maven { url 'https://developer.huawei.com/repo/' }`
        );
        config.modResults.contents = buildGradle;
      }
    }
    return config;
  });
};

const withZegoAppBuildGradle = (config) => {
  return withAppBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      let buildGradle = config.modResults.contents;
      
      if (!buildGradle.includes('libc++_shared.so')) {
        const packagingOptions = `
    packagingOptions {
        pickFirst 'lib/x86/libc++_shared.so'
        pickFirst 'lib/x86_64/libc++_shared.so'
        pickFirst 'lib/armeabi-v7a/libc++_shared.so'
        pickFirst 'lib/arm64-v8a/libc++_shared.so'
    }`;
        
        buildGradle = buildGradle.replace(
          /android\s*\{/,
          `android {${packagingOptions}`
        );
        config.modResults.contents = buildGradle;
      }
    }
    return config;
  });
};

const withZegoCloud = (config) => {
  config = withZegoProjectBuildGradle(config);
  config = withZegoAppBuildGradle(config);
  return config;
};

module.exports = withZegoCloud;

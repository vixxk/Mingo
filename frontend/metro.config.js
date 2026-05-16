
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Add custom resolver to handle native-only modules on web
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && (
    moduleName.includes('@zegocloud') ||
    moduleName.includes('zego-express-engine') ||
    moduleName.includes('zego-zim') ||
    moduleName.includes('react-native-encrypted-storage') ||
    moduleName.includes('react-native-sound')
  )) {
    return {
      filePath: path.resolve(__dirname, 'mocks/empty-module.js'),
      type: 'sourceFile',
    };
  }
  
  // Default resolution
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;


const config = require('../config/env');

function getZegoCredentials() {
  const { appId, appSign } = config.zego;

  if (!appId || !appSign) {
    throw new Error('ZEGOCLOUD appId and appSign must be configured');
  }

  return { appId, appSign };
}

module.exports = { getZegoCredentials };

const config = require('../config/env');
const { RtcTokenBuilder, RtcRole } = require('agora-token');

// Tokens are valid for 2 hours — plenty for the longest call session, and
// every session request mints a fresh token.
const TOKEN_EXPIRATION_SECONDS = 2 * 60 * 60;

/**
 * Returns the Agora app credentials, or throws when they are not configured.
 * The backend refuses to mint tokens without the App Certificate (which is
 * required for any non-testing Agora project).
 */
function getAgoraCredentials() {
  const { appId, appCertificate } = config.agora;

  // Treat placeholder values (.env template defaults) as "not configured" so
  // the backend never mints tokens against bogus credentials.
  const isPlaceholder = (v) =>
    !v || /your_agora|placeholder|change_me/i.test(v);

  if (isPlaceholder(appId) || isPlaceholder(appCertificate)) {
    throw new Error('AGORA_APP_ID and AGORA_APP_CERTIFICATE must be configured');
  }

  return { appId, appCertificate };
}

/**
 * Builds an Agora RTC token for the given channel.
 *
 * uid is set to 0 so the same token is valid for BOTH participants — Agora
 * treats a uid of 0 as "any user may join with this token". Each client then
 * joins with uid 0 and the SDK assigns them unique random user IDs.
 *
 * @param {string} channelName - The Agora channel (the call's roomId).
 * @returns {string} The RTC token.
 */
function buildAgoraRtcToken(channelName) {
  const { appId, appCertificate } = getAgoraCredentials();

  const currentTimestamp = Math.floor(Date.now() / 1000);
  const expireTime = currentTimestamp + TOKEN_EXPIRATION_SECONDS;

  return RtcTokenBuilder.buildTokenWithUid(
    appId,
    appCertificate,
    channelName,
    0, // any uid may join with this token
    RtcRole.PUBLISHER,
    expireTime,
    expireTime
  );
}

module.exports = { getAgoraCredentials, buildAgoraRtcToken };

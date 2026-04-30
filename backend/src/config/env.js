const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

module.exports = {
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  mongo: {
    uri: process.env.MONGO_URI,
  },

  redis: {
    url: process.env.REDIS_URL,
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  zego: {
    appId: parseInt(process.env.ZEGO_APP_ID, 10) || 0,
    appSign: process.env.ZEGO_APP_SIGN || '',
  },

  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    serviceSid: process.env.TWILIO_SERVICE_SID || '',
  },

  test: {
    adminPhone: process.env.TEST_ADMIN_PHONE,
    adminOtp: process.env.TEST_ADMIN_OTP,
    listenerPhone: process.env.TEST_LISTENER_PHONE,
    listenerOtp: process.env.TEST_LISTENER_OTP,
  },
};

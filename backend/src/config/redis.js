const Redis = require('ioredis');
const config = require('./env');

const redis = new Redis(config.redis.url, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 200, 5000);
    console.log(`🔄 Redis reconnecting in ${delay}ms (attempt ${times})`);
    return delay;
  },
  reconnectOnError(err) {
    const targetErrors = ['READONLY', 'ECONNRESET'];
    return targetErrors.some((e) => err.message.includes(e));
  },
});

redis.on('connect', () => {
  console.log('🔴 Redis connected');
});

redis.on('error', (err) => {
  console.error('❌ Redis error:', err.message);
});


const REDIS_KEYS = {
  LISTENERS_AVAILABLE: 'listeners:available',
  LISTENERS_SCORE: 'listeners:score',
  LOCK: (listenerId) => `lock:${listenerId}`,
  ONLINE: (userId) => `online:${userId}`,
};

module.exports = { redis, REDIS_KEYS };

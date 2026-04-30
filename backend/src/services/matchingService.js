const { redis, REDIS_KEYS } = require('../config/redis');
const AppError = require('../utils/appError');

const LOCK_TTL = 20; 

class MatchingService {
    static async findMatch(userId) {
    
    const topListeners = await redis.zrevrange(REDIS_KEYS.LISTENERS_SCORE, 0, 49);

    if (topListeners.length === 0) {
      throw new AppError('No listeners available at the moment', 404);
    }

    for (const listenerId of topListeners) {
      
      if (listenerId === userId) continue;

      
      const isAvailable = await redis.sismember(REDIS_KEYS.LISTENERS_AVAILABLE, listenerId);
      if (!isAvailable) continue;

      
      const lockKey = REDIS_KEYS.LOCK(listenerId);
      const acquired = await redis.set(lockKey, userId, 'NX', 'EX', LOCK_TTL);

      if (acquired === 'OK') {
        return {
          listenerId,
          locked: true,
          lockTtl: LOCK_TTL,
        };
      }
      
    }

    throw new AppError('All listeners are currently busy. Please try again.', 503);
  }

    static async releaseLock(listenerId) {
    await redis.del(REDIS_KEYS.LOCK(listenerId));
  }

    static async isLocked(listenerId) {
    const locked = await redis.exists(REDIS_KEYS.LOCK(listenerId));
    return locked === 1;
  }
}

module.exports = MatchingService;

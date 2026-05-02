const { redis, REDIS_KEYS } = require('../config/redis');
const Listener = require('../models/listenerModel');
const AppError = require('../utils/appError');

class ListenerService {
    static async getRecommended(limit = 20) {
    
    const listenerIds = await redis.zrevrange(
      REDIS_KEYS.LISTENERS_SCORE,
      0,
      limit - 1,
      'WITHSCORES'
    );

    if (listenerIds.length === 0) {
      
      const allListeners = await Listener.findAllWithUser();
      return allListeners
        .filter((l) => l.isOnline)
        .map((l) => ({
          id: l.userId?._id || l.userId,
          name: l.displayName || l.userId?.name,
          username: l.userId?.username,
          gender: l.userId?.gender,
          avatarIndex: l.userId?.avatarIndex,
          rating: l.rating,
          totalSessions: l.totalSessions,
          isOnline: l.isOnline,
          isVerified: l.verified,
          bestChoice: l.bestChoice,
          gradientColors: l.gradientColors,
        }));
    }

    
    const results = [];
    for (let i = 0; i < listenerIds.length; i += 2) {
      const userId = listenerIds[i];
      const score = parseFloat(listenerIds[i + 1]);

      
      const isAvailable = await redis.sismember(REDIS_KEYS.LISTENERS_AVAILABLE, userId);
      if (!isAvailable) continue;

      
      const isLocked = await redis.exists(REDIS_KEYS.LOCK(userId));
      if (isLocked) continue;

      const listener = await Listener.findByUserId(userId);
      if (listener) {
        results.push({
          id: listener.userId?._id || listener.userId,
          name: listener.displayName || listener.userId?.name,
          username: listener.userId?.username,
          gender: listener.userId?.gender,
          avatarIndex: listener.userId?.avatarIndex,
          rating: listener.rating,
          totalSessions: listener.totalSessions,
          isOnline: listener.isOnline,
          isVerified: listener.verified,
          bestChoice: listener.bestChoice,
          gradientColors: listener.gradientColors,
          score,
        });
      }
    }

    return results;
  }

    static async getProfile(listenerId) {
    const listener = await Listener.findByUserId(listenerId);
    if (!listener) {
      throw new AppError('Listener not found', 404);
    }

    return {
      id: listener.userId?._id || listener.userId,
      name: listener.userId?.name,
      username: listener.userId?.username,
      email: listener.userId?.email,
      rating: listener.rating,
      totalSessions: listener.totalSessions,
      isOnline: listener.isOnline,
      createdAt: listener.createdAt,
    };
  }
}

module.exports = ListenerService;

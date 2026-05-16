const { redis, REDIS_KEYS } = require('../config/redis');
const Listener = require('../models/listenerModel');
const AppError = require('../utils/appError');

const HEARTBEAT_TTL = 30; 

class PresenceService {
    static async goOnline(userId) {
    const listener = await Listener.findOne({ userId });
    if (!listener) {
      throw new AppError('Listener profile not found', 404);
    }

    const userIdStr = userId.toString();

    
    const pipeline = redis.pipeline();
    pipeline.sadd(REDIS_KEYS.LISTENERS_AVAILABLE, userIdStr);
    pipeline.set(REDIS_KEYS.ONLINE(userIdStr), '1', 'EX', HEARTBEAT_TTL);
    await pipeline.exec();

    
    await Listener.setOnlineStatus(userId, true);

    
    await PresenceService._updateScore(userId);

    return { status: 'online', userId: userIdStr };
  }

    static async goOffline(userId) {
    const userIdStr = userId.toString();

    const pipeline = redis.pipeline();
    pipeline.srem(REDIS_KEYS.LISTENERS_AVAILABLE, userIdStr);
    pipeline.del(REDIS_KEYS.ONLINE(userIdStr));
    pipeline.zrem(REDIS_KEYS.LISTENERS_SCORE, userIdStr);
    await pipeline.exec();

    await Listener.setOnlineStatus(userId, false);

    return { status: 'offline', userId: userIdStr };
  }

    static async heartbeat(userId) {
    const userIdStr = userId.toString();
    const isOnline = await redis.exists(REDIS_KEYS.ONLINE(userIdStr));
    if (!isOnline) {
      throw new AppError('Listener is not online', 400);
    }

    await redis.set(REDIS_KEYS.ONLINE(userIdStr), '1', 'EX', HEARTBEAT_TTL);
    return { status: 'heartbeat_refreshed' };
  }

    static async _updateScore(userId) {
    const stats = await Listener.getStats(userId);
    if (!stats) return;

    const { rating, totalSessions, secondsSinceLastSession } = stats;

    
    let recentActivity;
    if (secondsSinceLastSession < 3600) {
      recentActivity = 1.0;
    } else if (secondsSinceLastSession < 86400) {
      recentActivity = 0.5;
    } else {
      recentActivity = 0.1;
    }

    const score =
      rating * 0.6 +
      Math.log(totalSessions + 1) * 0.2 +
      recentActivity * 0.2;

    const userIdStr = userId.toString();
    await redis.zadd(REDIS_KEYS.LISTENERS_SCORE, score, userIdStr);
  }
}

module.exports = PresenceService;

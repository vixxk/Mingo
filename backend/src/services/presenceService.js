const { redis, REDIS_KEYS } = require('../config/redis');
const Listener = require('../models/listenerModel');
const AppError = require('../utils/appError');

const HEARTBEAT_TTL = 30; 

class PresenceService {
    static async goOnline(userId) {
    const User = require('../models/userModel');
    const user = await User.findById(userId);
    if (!user || user.role !== 'LISTENER') {
      throw new AppError('You must be in Listener mode to go online', 400);
    }

    const listener = await Listener.findOne({ userId });
    if (!listener) {
      throw new AppError('Listener profile not found', 404);
    }

    const userIdStr = userId.toString();

    
    // Maintain in Redis available set and persistent Redis online status (no auto expiration)
    const pipeline = redis.pipeline();
    pipeline.sadd(REDIS_KEYS.LISTENERS_AVAILABLE, userIdStr);
    pipeline.set(REDIS_KEYS.ONLINE(userIdStr), '1');
    await pipeline.exec();

    // Set DB isOnline flag
    await Listener.setOnlineStatus(userId, true);

    // Update ranking score
    await PresenceService._updateScore(userId);

    try {
      const { getIo } = require('../socket');
      getIo().emit('listener_status_changed', { userId: userIdStr, isOnline: true, isBusy: false });
      const sseService = require('./sseService');
      sseService.broadcastListenerStatus(userIdStr, true, false);
    } catch (e) {
      console.log('Socket or SSE error', e.message);
    }

    return { status: 'online', userId: userIdStr };
  }

  static async setBusy(userId, isBusy) {
    const userIdStr = userId.toString();
    const listener = await Listener.findOneAndUpdate(
      { userId },
      { isBusy, busySince: isBusy ? new Date() : null },
      { new: true }
    );
    if (!listener) return null;

    if (isBusy) {
      await redis.srem(REDIS_KEYS.LISTENERS_AVAILABLE, userIdStr);
    } else if (listener.isOnline) {
      await redis.sadd(REDIS_KEYS.LISTENERS_AVAILABLE, userIdStr);
    }

    try {
      const { getIo } = require('../socket');
      getIo().emit('listener_status_changed', {
        userId: userIdStr,
        isOnline: listener.isOnline,
        isBusy: listener.isBusy,
        busySince: listener.busySince,
      });
      const sseService = require('./sseService');
      sseService.broadcastListenerStatus(userIdStr, listener.isOnline, listener.isBusy, listener.busySince);
    } catch (e) {
      console.log('Socket or SSE error', e.message);
    }

    return { status: isBusy ? 'busy' : 'available', isOnline: listener.isOnline, isBusy: listener.isBusy, userId: userIdStr };
  }

  static async goOffline(userId) {
    const userIdStr = userId.toString();

    const pipeline = redis.pipeline();
    pipeline.srem(REDIS_KEYS.LISTENERS_AVAILABLE, userIdStr);
    pipeline.del(REDIS_KEYS.ONLINE(userIdStr));
    pipeline.zrem(REDIS_KEYS.LISTENERS_SCORE, userIdStr);
    await pipeline.exec();

    await Listener.setOnlineStatus(userId, false);

    try {
      const { getIo } = require('../socket');
      getIo().emit('listener_status_changed', { userId: userIdStr, isOnline: false, isBusy: false, busySince: null });
      const sseService = require('./sseService');
      sseService.broadcastListenerStatus(userIdStr, false, false, null);
    } catch (e) {
      console.log('Socket or SSE error', e.message);
    }

    return { status: 'offline', userId: userIdStr };
  }

  static async heartbeat(userId) {
    const userIdStr = userId.toString();
    await redis.sadd(REDIS_KEYS.LISTENERS_AVAILABLE, userIdStr);
    await redis.set(REDIS_KEYS.ONLINE(userIdStr), '1');
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

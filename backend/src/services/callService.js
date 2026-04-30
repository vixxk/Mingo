const { v4: uuidv4 } = require('uuid');
const { redis, REDIS_KEYS } = require('../config/redis');
const Session = require('../models/sessionModel');
const MatchingService = require('./matchingService');
const PresenceService = require('./presenceService');
const { getZegoCredentials } = require('../utils/zegoToken');
const AppError = require('../utils/appError');

class CallService {
    static async startCall(userId, listenerId = null) {
    const userIdStr = userId.toString();
    let matchedListenerId = listenerId;

    
    if (!matchedListenerId) {
      const match = await MatchingService.findMatch(userIdStr);
      matchedListenerId = match.listenerId;
    } else {
      const listenerIdStr = matchedListenerId.toString();
      
      const acquired = await redis.set(
        REDIS_KEYS.LOCK(listenerIdStr),
        userIdStr,
        'NX',
        'EX',
        20
      );
      if (acquired !== 'OK') {
        throw new AppError('Listener is currently unavailable', 409);
      }
      matchedListenerId = listenerIdStr;
    }

    
    const roomId = `call_${uuidv4()}`;

    
    const session = await Session.create({
      userId,
      listenerId: matchedListenerId,
      roomId,
    });

    
    await redis.srem(REDIS_KEYS.LISTENERS_AVAILABLE, matchedListenerId);

    
    const zegoCredentials = getZegoCredentials();

    return {
      sessionId: session._id,
      roomId,
      listenerId: matchedListenerId,
      zegoAppId: zegoCredentials.appId,
      zegoAppSign: zegoCredentials.appSign,
      startTime: session.startTime,
    };
  }

    static async endCall(sessionId, userId) {
    const session = await Session.findById(sessionId);
    if (!session) {
      throw new AppError('Session not found', 404);
    }

    const userIdStr = userId.toString();
    const sessionUserIdStr = session.userId.toString();
    const sessionListenerIdStr = session.listenerId.toString();

    
    if (sessionUserIdStr !== userIdStr && sessionListenerIdStr !== userIdStr) {
      throw new AppError('You are not part of this session', 403);
    }

    if (session.status !== 'active') {
      throw new AppError('Session is already ended', 400);
    }

    
    const endedSession = await Session.endSession(sessionId);

    
    await MatchingService.releaseLock(sessionListenerIdStr);
    await redis.sadd(REDIS_KEYS.LISTENERS_AVAILABLE, sessionListenerIdStr);

    
    await redis.set(REDIS_KEYS.ONLINE(sessionListenerIdStr), '1', 'EX', 30);

    
    await PresenceService._updateScore(session.listenerId);

    return {
      sessionId: endedSession._id,
      roomId: endedSession.roomId,
      startTime: endedSession.startTime,
      endTime: endedSession.endTime,
      status: endedSession.status,
    };
  }

    static async getSession(sessionId) {
    const session = await Session.findById(sessionId);
    if (!session) {
      throw new AppError('Session not found', 404);
    }
    return session;
  }

    static async getUserHistory(userId, limit, offset) {
    return Session.findByUserId(userId, limit, offset);
  }

    static async getListenerHistory(listenerId, limit, offset) {
    return Session.findByListenerId(listenerId, limit, offset);
  }
}

module.exports = CallService;

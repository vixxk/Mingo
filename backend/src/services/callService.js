const { v4: uuidv4 } = require('uuid');
const { redis, REDIS_KEYS } = require('../config/redis');
const Session = require('../models/sessionModel');
const User = require('../models/userModel');
const Listener = require('../models/listenerModel');
const Transaction = require('../models/transactionModel');
const MatchingService = require('./matchingService');
const PresenceService = require('./presenceService');
const { getZegoCredentials } = require('../utils/zegoToken');
const AppError = require('../utils/appError');
const ActivityLog = require('../models/ActivityLog');

class CallService {
    static async startCall(userId, listenerId = null, callType = 'audio') {
    const userIdStr = userId.toString();

    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found', 404);
    if (user.isBanned) throw new AppError('Your account is suspended', 403);

    // Minimum 1 minute cost: audio=10 coins/min, video=30 coins/min
    const minCoins = callType === 'video' ? 30 : 10;
    if (user.coins < minCoins) {
      throw new AppError('Insufficient coins. Please recharge.', 402);
    }

    let matchedListenerId = listenerId;

    
    if (!matchedListenerId) {
      const match = await MatchingService.findMatch(userIdStr);
      matchedListenerId = match.listenerId;
    } else {
      const listenerIdStr = matchedListenerId.toString();

      const listenerProfile = await Listener.findOne({ userId: listenerIdStr });
      if (!listenerProfile || listenerProfile.status !== 'approved') {
        throw new AppError('Listener is not available', 400);
      }

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
      callType,
    });

    
    // Mark listener as busy in DB
    await Listener.findOneAndUpdate({ userId: matchedListenerId }, { isBusy: true });

    await redis.srem(REDIS_KEYS.LISTENERS_AVAILABLE, matchedListenerId);

    
    const zegoCredentials = getZegoCredentials();

    
    const listenerUser = await User.findById(matchedListenerId).select('name username avatarIndex gender');
    const listenerProfile = await Listener.findOne({ userId: matchedListenerId });

    await ActivityLog.create({
      user: user.name,
      action: `Started ${callType} call`,
      type: 'call',
      icon: callType === 'video' ? 'videocam' : 'call',
      color: callType === 'video' ? '#3B82F6' : '#10B981',
    });

    return {
      sessionId: session._id,
      roomId,
      callType,
      listenerId: matchedListenerId,
      listenerName: listenerUser?.name || 'Listener',
      listenerUsername: listenerUser?.username,
      listenerAvatarIndex: listenerUser?.avatarIndex || 0,
      listenerGender: listenerUser?.gender,
      listenerRating: listenerProfile?.rating || 0,
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
      // Already ended (possibly by the billing timer auto-end)
      return {
        sessionId: session._id,
        roomId: session.roomId,
        callType: session.callType,
        startTime: session.startTime,
        endTime: session.endTime,
        duration: session.duration,
        coinsDeducted: session.coinsDeducted,
        status: session.status,
      };
    }

    // Stop the real-time billing timer
    try {
      const { stopCallBillingTimer } = require('../socket');
      stopCallBillingTimer(sessionId);
    } catch (e) {
      // Socket module may not be loaded in tests
    }

    // Finalize session status
    const endTime = new Date();
    session.endTime = endTime;
    session.status = 'completed';

    // Duration is already tracked incrementally by billing timer,
    // but do a final calculation in case of mismatch
    if (!session.duration || session.duration === 0) {
      const durationMs = endTime - session.startTime;
      session.duration = Math.ceil(durationMs / 60000);
    }

    await session.save();

    // Update listener call counters (earnings already credited per-minute by billing timer)
    const listener = await Listener.findOne({ userId: session.listenerId });
    if (listener) {
      if (session.callType === 'audio') {
        listener.audioCalls += 1;
        listener.todayAudioCalls += 1;
      } else {
        listener.videoCalls += 1;
        listener.todayVideoCalls += 1;
      }
      listener.totalSessions += 1;
      await listener.save();
    }

    
    // Mark listener as not busy in DB
    await Listener.findOneAndUpdate({ userId: sessionListenerIdStr }, { isBusy: false });

    await MatchingService.releaseLock(sessionListenerIdStr);
    await redis.sadd(REDIS_KEYS.LISTENERS_AVAILABLE, sessionListenerIdStr);

    
    await redis.set(REDIS_KEYS.ONLINE(sessionListenerIdStr), '1', 'EX', 30);

    
    await PresenceService._updateScore(session.listenerId);

    return {
      sessionId: session._id,
      roomId: session.roomId,
      callType: session.callType,
      startTime: session.startTime,
      endTime: session.endTime,
      duration: session.duration,
      coinsDeducted: session.coinsDeducted,
      status: session.status,
    };
  }

    static async getSession(sessionId) {
    const session = await Session.findById(sessionId)
      .populate('userId', 'name username avatarIndex gender')
      .populate('listenerId', 'name username avatarIndex gender');
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

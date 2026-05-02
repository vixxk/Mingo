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

    const minCoins = callType === 'video' ? 6 : 1;
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
      throw new AppError('Session is already ended', 400);
    }

    
    const endedSession = await Session.endSession(sessionId);

    
    if (endedSession.coinsDeducted > 0) {
      const user = await User.findById(session.userId);
      if (user) {
        user.coins = Math.max(0, user.coins - endedSession.coinsDeducted);
        await user.save();

        await Transaction.create({
          userId: session.userId,
          type: 'call_debit',
          amount: 0,
          coins: -endedSession.coinsDeducted,
          description: `${session.callType} call - ${endedSession.duration} min`,
          status: 'completed',
          metadata: { sessionId: session._id },
        });
      }

      const listener = await Listener.findOne({ userId: session.listenerId });
      if (listener) {
        listener.earnings += endedSession.listenerEarnings;
        listener.todayEarnings += endedSession.listenerEarnings;
        if (session.callType === 'audio') {
          listener.audioCalls += 1;
          listener.todayAudioCalls += 1;
        } else {
          listener.videoCalls += 1;
          listener.todayVideoCalls += 1;
        }
        await listener.save();
      }
    }

    
    await MatchingService.releaseLock(sessionListenerIdStr);
    await redis.sadd(REDIS_KEYS.LISTENERS_AVAILABLE, sessionListenerIdStr);

    
    await redis.set(REDIS_KEYS.ONLINE(sessionListenerIdStr), '1', 'EX', 30);

    
    await PresenceService._updateScore(session.listenerId);

    return {
      sessionId: endedSession._id,
      roomId: endedSession.roomId,
      callType: endedSession.callType,
      startTime: endedSession.startTime,
      endTime: endedSession.endTime,
      duration: endedSession.duration,
      coinsDeducted: endedSession.coinsDeducted,
      status: endedSession.status,
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

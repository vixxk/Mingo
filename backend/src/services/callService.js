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
const PushService = require('./pushService');

class CallService {
    static async incrementListenerCounters(listenerId, callType) {
    if (!listenerId) return;
    const Listener = require('../models/listenerModel');
    const listener = await Listener.findOne({ userId: listenerId });
    if (listener) {
      if (callType === 'audio') {
        listener.audioCalls += 1;
        listener.todayAudioCalls += 1;
      } else {
        listener.videoCalls += 1;
        listener.todayVideoCalls += 1;
      }
      listener.totalSessions += 1;
      await listener.save();
    }
  }

    static async startCall(userId, listenerId = null, callType = 'audio') {
    const userIdStr = userId.toString();

    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found', 404);
    if (user.isBanned) throw new AppError('Your account is suspended', 403);

    // Minimum 1 minute cost: audio=10 coins/min, video=40 coins/min
    const minCoins = callType === 'video' ? 40 : 10;
    if (user.coins < minCoins) {
      PushService.sendPushNotification(userIdStr, {
        title: 'Recharge to start your call',
        body: `You need at least ${minCoins} coins to start a ${callType} call.`,
        data: { type: 'insufficient_balance', reason: 'call_start', callType },
      }).catch(err => console.error('[CallService] Insufficient-balance push failed:', err.message));
      throw new AppError('Insufficient coins. Please recharge.', 402);
    }

    // Check if the user is already in an active call session
    const existingUserSession = await Session.findOne({
      $or: [
        { userId: userIdStr },
        { listenerId: userIdStr }
      ],
      status: 'active'
    });
    if (existingUserSession) {
      throw new AppError('You are already in an active session', 400);
    }

    let matchedListenerId = listenerId;

    if (!matchedListenerId) {
      const match = await MatchingService.findMatch(userIdStr);
      matchedListenerId = match.listenerId;
    }

    const listenerIdStr = matchedListenerId.toString();

    const listenerProfile = await Listener.findOne({ userId: listenerIdStr });
    if (!listenerProfile || listenerProfile.status !== 'approved' || !listenerProfile.isOnline) {
      throw new AppError('Listener is offline', 400);
    }

    const typeAllowed =
      (callType === 'audio' && listenerProfile.audioEnabled !== false) ||
      (callType === 'video' && listenerProfile.videoEnabled === true) ||
      (callType === 'chat' && listenerProfile.chatEnabled !== false);
    if (!typeAllowed) {
      throw new AppError(`Listener does not support ${callType} calls`, 400);
    }

    if (listenerProfile.isBusy) {
      const existingSession = await Session.findOne({
        $or: [
          { userId: listenerIdStr },
          { listenerId: listenerIdStr }
        ],
        status: 'active'
      });
      if (!existingSession) {
        await Listener.findOneAndUpdate({ userId: listenerIdStr }, { isBusy: false, busySince: null });
        listenerProfile.isBusy = false;
        listenerProfile.busySince = null;
      } else if (existingSession.lastDeductionTime) {
        throw new AppError('Listener is currently unavailable', 409);
      } else {
        const sessionAge = Date.now() - new Date(existingSession.startTime || existingSession.createdAt).getTime();
        if (sessionAge > 120000) {
          existingSession.status = 'completed';
          existingSession.endTime = new Date();
          await existingSession.save();
          await Listener.findOneAndUpdate({ userId: listenerIdStr }, { isBusy: false, busySince: null });
          listenerProfile.isBusy = false;
          listenerProfile.busySince = null;
        } else {
          throw new AppError('Listener is currently unavailable', 409);
        }
      }
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

    // Check if the selected listener is already in an active call session
    const existingListenerSession = await Session.findOne({
      $or: [
        { userId: listenerIdStr },
        { listenerId: listenerIdStr }
      ],
      status: 'active'
    });
    if (existingListenerSession) {
      if (!existingListenerSession.lastDeductionTime) {
        const sessionAge = Date.now() - new Date(existingListenerSession.startTime || existingListenerSession.createdAt).getTime();
        if (sessionAge > 120000) {
          existingListenerSession.status = 'completed';
          existingListenerSession.endTime = new Date();
          await existingListenerSession.save();
        } else {
          throw new AppError('Listener is currently busy in another call', 400);
        }
      } else {
        throw new AppError('Listener is currently busy in another call', 400);
      }
    }

    
    const roomId = `call_${uuidv4()}`;

    
    const session = await Session.create({
      userId,
      listenerId: matchedListenerId,
      roomId,
      callType,
    });

    
    // Mark listener as busy in DB
    const now = new Date();
    await Listener.findOneAndUpdate({ userId: matchedListenerId }, { isBusy: true, busySince: now });

    try {
      const { getIo } = require('../socket');
      getIo().emit('listener_status_changed', { userId: matchedListenerId, isOnline: true, isBusy: true, busySince: now });
      const sseService = require('./sseService');
      sseService.broadcastListenerStatus(matchedListenerId, true, true, now);
    } catch (e) {
      console.log('Socket or SSE error emitting status changed', e.message);
    }

    await redis.srem(REDIS_KEYS.LISTENERS_AVAILABLE, matchedListenerId);

    
    const zegoCredentials = getZegoCredentials();

    
    const listenerUser = await User.findById(matchedListenerId).select('name username avatarIndex gender');

    await ActivityLog.create({
      user: user.name,
      action: `Started ${callType} call`,
      type: 'call',
      icon: callType === 'video' ? 'videocam' : 'call',
      color: callType === 'video' ? '#3B82F6' : '#10B981',
    });

    // Send push notification to listener
    try {
      console.log(`[CallService] Sending push notification to listener: ${matchedListenerId}`);
      PushService.sendPushNotification(matchedListenerId, {
        title: `Incoming ${callType === 'video' ? 'Video' : 'Audio'} Call`,
        body: `${user.name || 'Someone'} is calling you. Tap to answer.`,
        data: {
          type: 'incoming_call',
          callId: session._id.toString(),
          roomId: roomId,
          callerId: userId.toString(),
          callerName: user.name || 'User',
          avatarIndex: (user.avatarIndex || 0).toString(),
          gender: user.gender || 'Female',
          callType: callType,
          // Same app-scoped credentials for the accepting side (notification path)
          zegoAppId: zegoCredentials.appId,
          zegoAppSign: zegoCredentials.appSign,
        }
      }).catch(err => {
        console.error('[CallService] Push notification promise failed:', err.message);
      });
    } catch (pushErr) {
      console.error('[CallService] Failed to queue push notification:', pushErr.message);
    }

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

    const hasStarted = session.lastDeductionTime !== null;

    if (!hasStarted) {
      // Call never connected or billing never started! Mark as cancelled.
      session.status = 'cancelled';
      session.endTime = new Date();
      session.duration = 0;
      session.coinsDeducted = 0;
      session.listenerEarnings = 0;
      session.zegoCost = 0;
      session.infraCost = 0;
      session.platformProfit = 0;
      await session.save();

      // Mark listener as not busy in DB
      await Listener.findOneAndUpdate({ userId: sessionListenerIdStr }, { isBusy: false, busySince: null });

      try {
        const { getIo } = require('../socket');
        getIo().to(`user_${sessionUserIdStr}`).emit('call_ended', { sessionId });
        getIo().to(`user_${sessionListenerIdStr}`).emit('call_ended', { sessionId });
        getIo().emit('listener_status_changed', { userId: sessionListenerIdStr, isOnline: true, isBusy: false });
        const sseService = require('./sseService');
        sseService.broadcastListenerStatus(sessionListenerIdStr, true, false, null);
      } catch (e) {
        console.log('Socket or SSE error emitting call_ended/status changed', e.message);
      }

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
        duration: 0,
        coinsDeducted: 0,
        status: 'cancelled',
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
    await CallService.incrementListenerCounters(session.listenerId, session.callType);

    
    // Mark listener as not busy in DB
    await Listener.findOneAndUpdate({ userId: sessionListenerIdStr }, { isBusy: false, busySince: null });

    try {
      const { getIo } = require('../socket');
      getIo().to(`user_${sessionUserIdStr}`).emit('call_ended', { sessionId });
      getIo().to(`user_${sessionListenerIdStr}`).emit('call_ended', { sessionId });
      getIo().emit('listener_status_changed', { userId: sessionListenerIdStr, isOnline: true, isBusy: false });
      const sseService = require('./sseService');
      sseService.broadcastListenerStatus(sessionListenerIdStr, true, false, null);
    } catch (e) {
      console.log('Socket or SSE error emitting call_ended/status changed', e.message);
    }

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

    // Attach the current Zego credentials so both participants always join the
    // same Zego app — the client must never rely on stale hardcoded values.
    let credentials = null;
    try {
      credentials = getZegoCredentials();
    } catch (e) {
      console.log('[CallService] Zego credentials unavailable:', e.message);
    }

    return {
      ...session.toObject(),
      ...(credentials ? { zegoAppId: credentials.appId, zegoAppSign: credentials.appSign } : {}),
    };
  }

    static async getUserHistory(userId, limit, offset) {
    return Session.findByUserId(userId, limit, offset);
  }

    static async getListenerHistory(listenerId, limit, offset) {
    return Session.findByListenerId(listenerId, limit, offset);
  }

  static async getActiveSession(userId) {
    const userIdStr = userId.toString();
    const session = await Session.findOne({
      status: 'active',
      callType: { $in: ['audio', 'video', 'chat'] },
      $or: [
        { userId: userIdStr },
        { listenerId: userIdStr }
      ]
    }).populate('userId', 'name username avatarIndex gender')
      .populate('listenerId', 'name username avatarIndex gender');
    if (!session) return null;

    // Attach the current Zego credentials so a resumed call joins the same app.
    let credentials = null;
    try {
      credentials = getZegoCredentials();
    } catch (e) {
      console.log('[CallService] Zego credentials unavailable:', e.message);
    }
    return {
      ...session.toObject(),
      ...(credentials ? { zegoAppId: credentials.appId, zegoAppSign: credentials.appSign } : {}),
    };
  }
}

module.exports = CallService;

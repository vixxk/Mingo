const { Server } = require('socket.io');
const Message = require('./models/messageModel');
const Conversation = require('./models/conversationModel');
const User = require('./models/userModel');
const Listener = require('./models/listenerModel');
const Transaction = require('./models/transactionModel');
const Session = require('./models/sessionModel');
const jwt = require('jsonwebtoken');
const config = require('./config/env');
const { redis, REDIS_KEYS } = require('./config/redis');
const PushService = require('./services/pushService');
const CallService = require('./services/callService');
const { getAvatarUrl } = require('./utils/avatars');
const { analyzeMessage } = require('./utils/contactSafety');
const { analyzeAbuse } = require('./utils/abusiveLanguage');

// Chat anti-abuse escalation thresholds
const ABUSE_LOCK_THRESHOLD = 5;      // violations before a temporary 24h chat lock
const ABUSE_LOCK_DURATION_MS = 24 * 60 * 60 * 1000;

let io;

// Chat billing constants
const CHAT_COINS_PER_SESSION = 10;    // 10 coins per 5-minute chat session (10 Coins / 5 mins)
const CHAT_SESSION_DURATION = 5 * 60 * 1000; // 5 minutes in ms
const CHAT_LISTENER_PAYOUT = 2.50;   // Listener gets ₹2.50 per 5-minute block (Rs. 0.50/min)

// Presence heartbeat TTL — must stay in sync with PresenceService.HEARTBEAT_TTL
const PRESENCE_HEARTBEAT_TTL = 30;

// Active chat session timers: { conversationId: timerRef }
const chatSessionTimers = {};
const chatSessionOfflineCheckers = {};

// Track when users/listeners go offline: { userIdStr: timestamp }
const userOfflineSince = {};
const OFFLINE_CHAT_AUTO_END_MS = 5 * 60 * 1000; // 5 minutes

// ─── Call Billing ────────────────────────────────────────────
// Rates per minute
const AUDIO_COINS_PER_MIN = 10;  // 10 coins/min (from user screenshot)
const VIDEO_COINS_PER_MIN = 40;  // 40 coins/min (from user screenshot)
const AUDIO_PAYOUT_PER_MIN = 1.00; // ₹1.00/min listener payout
const VIDEO_PAYOUT_PER_MIN = 4.00; // ₹4.00/min listener payout (from listener screenshot)
const CALL_BILLING_INTERVAL = Number(process.env.CALL_BILLING_INTERVAL_MS) || 60 * 1000; // 1 minute (env-overridable for tests)
const LOW_BALANCE_THRESHOLD = 10; // Warn when below this many coins remaining

// When a listener's LAST socket drops, wait this long for a reconnect before
// auto-marking them offline. Covers transient network blips and quick app
// reconnects; a force-closed app (swiped from RAM) never reconnects, so it
// goes offline once the grace period elapses instead of staying "online"
// forever.
const DISCONNECT_OFFLINE_GRACE_MS = Number(process.env.DISCONNECT_OFFLINE_GRACE_MS) || 30 * 1000;

// Active call billing timers: { sessionId: intervalRef }
const callBillingTimers = {};

// Active background offline timers for backgrounded users
const backgroundOfflineTimers = {};

// Random Call Matching Pools
const randomUsers = new Set();
const randomListeners = new Set();
const randomSearchTimeouts = {};

async function checkAndEmitActiveCall(socket, userId) {
  try {
    const CallService = require('./services/callService');
    const res = await CallService.getActiveIncomingCall(userId);
    if (res?.hasIncomingCall && res?.callData) {
      console.log(`[Socket] Found active ringing call on connect for user ${userId}, emitting incoming_call`);
      socket.emit('incoming_call', res.callData);
    }
  } catch (err) {
    console.error('[Socket] Error checking active call on connect:', err.message);
  }
}

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
      allowedHeaders: '*'
    }
  });

  const sseService = require('./services/sseService');
  sseService.setIo(io);

  startOfflineChatSessionChecker();

  io.on('connection', (socket) => {
    console.log('User connected to socket:', socket.id);
    socket.connectTime = Date.now();

    // Try to authenticate immediately from handshake auth token or query token
    const handshakeToken = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (handshakeToken) {
      try {
        const decoded = jwt.verify(handshakeToken, config.jwt.secret);
        socket.userId = decoded.userId;
        socket.join(`user_${decoded.userId}`);
        console.log(`Socket ${socket.id} automatically authenticated from handshake as ${decoded.userId}`);
        const userIdStr = decoded.userId.toString();
        delete userOfflineSince[userIdStr];
        if (backgroundOfflineTimers[userIdStr]) {
          clearTimeout(backgroundOfflineTimers[userIdStr]);
          delete backgroundOfflineTimers[userIdStr];
          console.log(`Cancelled background offline timer for ${userIdStr} on handshake auth`);
        }
        if (!socket.appOpened) {
          socket.appOpened = true;
          User.findByIdAndUpdate(decoded.userId, { $inc: { appOpens: 1 } }).catch(err => console.error('handshake appOpen inc error:', err));
        }
        checkAndEmitActiveCall(socket, decoded.userId);
      } catch (err) {
        console.error('Socket handshake auth error:', err.message);
      }
    }

    // Debug: Log all incoming events
    socket.onAny((eventName, ...args) => {
      console.log(`[Socket Debug] Event: ${eventName}, Data:`, JSON.stringify(args));
    });

    socket.on('authenticate', (token) => {
      try {
        const decoded = jwt.verify(token, config.jwt.secret);
        socket.userId = decoded.userId;
        socket.join(`user_${decoded.userId}`);
        console.log(`Socket ${socket.id} authenticated as ${decoded.userId}`);
        const userIdStr = decoded.userId.toString();
        delete userOfflineSince[userIdStr];
        if (backgroundOfflineTimers[userIdStr]) {
          clearTimeout(backgroundOfflineTimers[userIdStr]);
          delete backgroundOfflineTimers[userIdStr];
          console.log(`Cancelled background offline timer for ${userIdStr} on authenticate event`);
        }
        if (!socket.appOpened) {
          socket.appOpened = true;
          User.findByIdAndUpdate(decoded.userId, { $inc: { appOpens: 1 } }).catch(err => console.error('authenticate appOpen inc error:', err));
        }
        checkAndEmitActiveCall(socket, decoded.userId);
      } catch (err) {
        console.error('Socket auth error:', err.message);
      }
    });

    socket.on('app_backgrounded', () => {
      if (socket.userId) {
        socket.isBackgrounded = true;
        console.log(`User ${socket.userId} marked as backgrounded (in RAM)`);
      }
    });

    socket.on('app_foregrounded', () => {
      if (socket.userId) {
        socket.isBackgrounded = false;
        console.log(`User ${socket.userId} marked as foregrounded`);
        const userIdStr = socket.userId.toString();
        if (backgroundOfflineTimers[userIdStr]) {
          clearTimeout(backgroundOfflineTimers[userIdStr]);
          delete backgroundOfflineTimers[userIdStr];
          console.log(`Cancelled background offline timer for ${userIdStr}`);
        }
      }
    });

    socket.on('join_conversation', async (conversationId) => {
      socket.join(conversationId);
      console.log(`Socket ${socket.id} joined conversation ${conversationId}`);
      await syncAndResumeChatSession(conversationId);
    });

    socket.on('heartbeat', async () => {
      if (socket.userId) {
        const userIdStr = socket.userId.toString();
        // A heartbeat means the app is alive — cancel any pending auto-offline
        // timer scheduled by a recent disconnect.
        if (backgroundOfflineTimers[userIdStr]) {
          clearTimeout(backgroundOfflineTimers[userIdStr]);
          delete backgroundOfflineTimers[userIdStr];
        }
        const listener = await Listener.findOne({ userId: socket.userId });
        if (listener && listener.isOnline) {
          await redis.set(REDIS_KEYS.ONLINE(userIdStr), '1').catch(() => {});
        }
      }
    });

    socket.on('listener_set_busy', async () => {
      if (socket.userId) {
        const PresenceService = require('./services/presenceService');
        await PresenceService.setBusy(socket.userId, true).catch(err => console.error('Error in listener_set_busy:', err.message));
      }
    });

    socket.on('listener_clear_busy', async () => {
      if (socket.userId) {
        const PresenceService = require('./services/presenceService');
        await PresenceService.setBusy(socket.userId, false).catch(err => console.error('Error in listener_clear_busy:', err.message));
      }
    });

    socket.on('leave_conversation', async (conversationId) => {
      socket.leave(conversationId);
      console.log(`Socket ${socket.id} left conversation ${conversationId}`);
      if (socket.userId && conversationId) {
        try {
          const conv = await Conversation.findById(conversationId);
          if (conv && conv.chatSession && conv.chatSession.active) {
            const otherParticipant = conv.participants.find(p => p.toString() !== socket.userId.toString());
            if (otherParticipant) {
              io.to(`user_${otherParticipant}`).emit('chat_user_offline', {
                conversationId: conversationId.toString(),
                userId: socket.userId,
                message: 'User left the chat page.',
              });
            }
          }
        } catch (err) {
          console.error('[Socket] leave_conversation notify error:', err.message);
        }
      }
    });

    socket.on('send_message', async (data) => {
      console.log('[Socket] send_message event received:', JSON.stringify(data));
      let { conversationId, senderId, senderModel, content, type, mediaUrl } = data;
      
      try {
        const mongoose = require('mongoose');
        let conversation = null;
        if (conversationId && mongoose.Types.ObjectId.isValid(conversationId)) {
          conversation = await Conversation.findById(conversationId);
        }
        if (!conversation && senderId && conversationId && mongoose.Types.ObjectId.isValid(conversationId)) {
          conversation = await Conversation.findOne({
            participants: { $all: [senderId, conversationId] }
          });
          if (conversation) {
            conversationId = conversation._id.toString();
          }
        }
        if (!conversation) {
          socket.emit('message_error', { error: 'Conversation not found' });
          return;
        }

        const sender = await User.findById(senderId);
        if (!sender) {
          socket.emit('message_error', { error: 'User not found' });
          return;
        }

        // ─── TEMPORARY CHAT RESTRICTION (anti-abuse escalation) ───
        // Repeated abusive messages lock chat sending for 24 hours.
        if (sender.abuseLockedUntil && new Date(sender.abuseLockedUntil) > new Date()) {
          socket.emit('message_error', {
            type: 'chat_restricted',
            error: 'Your chat access is temporarily restricted due to repeated abusive messages.',
          });
          return;
        }

        // Prevent listener from sending messages if they are offline
        if (sender.role === 'LISTENER') {
          const listener = await Listener.findOne({ userId: senderId });
          if (listener && !listener.isOnline) {
            socket.emit('message_error', { 
              error: 'You are offline. Please go online to send messages.',
              type: 'listener_offline' 
            });
            return;
          }
          // Keep the presence heartbeat key fresh — an actively chatting
          // listener must never look offline just because the key's TTL lapsed.
          await redis
            .set(REDIS_KEYS.ONLINE(senderId.toString()), '1', 'EX', PRESENCE_HEARTBEAT_TTL)
            .catch(() => {});
        }

        // Prevent user/listener from responding to messages from admin
        const otherParticipantId = conversation.participants.find(p => p.toString() !== senderId.toString());
        if (otherParticipantId) {
          const otherUser = await User.findById(otherParticipantId);
          if (otherUser && (otherUser.role === 'ADMIN' || otherUser.role.endsWith('_ADMIN'))) {
            if (sender.role !== 'ADMIN' && !sender.role.endsWith('_ADMIN')) {
              socket.emit('message_error', { error: 'Replying to admin messages is disabled.' });
              return;
            }
          }
        }

        // ─── CONTACT-SHARING SAFETY BLOCK ──────────────────────
        // Phone numbers can never be delivered — for BOTH users and
        // listeners. Blocks even from modified clients; the UI shows a
        // system message + the sender gets a dedicated event.
        const isTextLike = !type || type === 'text';
        if (isTextLike && typeof content === 'string' && content.trim()) {
          const safety = analyzeMessage(content);
          if (safety.hasPhone) {
            console.log(`[Socket] Blocked contact sharing in conv ${conversationId} from ${senderId}`);
            socket.emit('contact_share_blocked', {
              conversationId,
              content,
              phoneNumbers: safety.phoneNumbers,
              maskedNumber: safety.phoneNumbers.length ? safety.phoneNumbers[0].replace(/\d/g, '•') : null,
              hasContactIntent: safety.hasContactIntent,
            });
            const blockedMsg = new Message({
              conversationId,
              sender: null,
              senderModel: 'System',
              content: 'Contact information sharing was blocked for safety.',
              type: 'system',
            });
            await blockedMsg.save();
            await Conversation.findByIdAndUpdate(conversationId, { lastMessage: blockedMsg._id });
            io.to(conversationId).emit('receive_message', blockedMsg);
            return;
          }
        }

        // ─── ANTI-ABUSE BLOCK ──────────────────────────────────
        // Abusive / offensive messages are never delivered — for BOTH users
        // and listeners. The sender is asked to edit the message, and repeat
        // SEVERE violations escalate to a temporary chat restriction.
        // Mild words are also blocked from delivery but never count toward
        // the lock, so a playful slip can't trigger a 24h ban.
        if (isTextLike && typeof content === 'string' && content.trim()) {
          const abuse = analyzeAbuse(content);
          if (abuse.hasAbuse) {
            const isSevere = abuse.severity === 'severe';
            console.log(`[Socket] Blocked ${isSevere ? 'abusive' : 'disrespectful'} message in conv ${conversationId} from ${senderId}`);

            let violationCount = sender.abuseViolations || 0;
            let restriction = null;
            if (isSevere) {
              violationCount += 1;
              sender.abuseViolations = violationCount;
              if (violationCount >= ABUSE_LOCK_THRESHOLD && !sender.abuseLockedUntil) {
                sender.abuseLockedUntil = new Date(Date.now() + ABUSE_LOCK_DURATION_MS);
                restriction = sender.abuseLockedUntil;
              }
              await sender.save();
            }

            socket.emit('abusive_message_blocked', {
              conversationId,
              content,
              matched: abuse.matched,
              severity: abuse.severity,
              violations: violationCount,
            });

            const blockedMsg = new Message({
              conversationId,
              sender: null,
              senderModel: 'System',
              content: restriction
                ? 'Your chat access has been temporarily restricted for 24 hours due to repeated abusive messages.'
                : (isSevere
                    ? 'Please keep conversations respectful. Abusive language is not allowed.'
                    : 'Please keep the conversation respectful and friendly.'),
              type: 'system',
            });
            await blockedMsg.save();
            await Conversation.findByIdAndUpdate(conversationId, { lastMessage: blockedMsg._id });
            io.to(conversationId).emit('receive_message', blockedMsg);

            if (restriction) {
              io.to(`user_${senderId}`).emit('chat_restricted', {
                conversationId,
                lockedUntil: restriction,
              });
            }
            return;
          }
        }

        // Determine if the sender is the USER (not the listener)
        const isUserRole = sender.role === 'USER';

        // --- FREE MESSAGE LOGIC (the user's FIRST message of each session
        // phase is free) ---
        // A "phase" is the conversation period between two paid chat sessions
        // (or the very first period of the conversation). Every new phase
        // grants the user ONE free message; the user's SECOND message of the
        // same phase starts the paid session (and its timer).
        let userMessageCount = 0;
        if (isUserRole) {
          const listenerParticipantId = conversation.participants.find(
            (p) => p.toString() !== senderId.toString()
          );
          let lastEndedSession = null;
          try {
            lastEndedSession = await Session.findOne({
              userId: senderId,
              listenerId: listenerParticipantId,
              callType: 'chat',
              status: { $in: ['completed', 'cancelled'] },
              endTime: { $ne: null }, // only sessions that actually ended
            }).sort({ endTime: -1 });
          } catch (sessErr) {
            console.error('[Socket] Last ended chat session lookup error:', sessErr.message);
          }
          const phaseStart = (lastEndedSession && lastEndedSession.endTime) || conversation.createdAt;

          userMessageCount = await Message.countDocuments({
            conversationId,
            sender: senderId,
            senderModel: 'User',
            createdAt: { $gt: phaseStart },
          });
        }

        if (isUserRole && userMessageCount < 1) {
          // Save and send the message
          console.log(`[Socket] Saving FREE message in conv ${conversationId} from ${senderId}`);
          const message = new Message({
            conversationId,
            sender: senderId,
            senderModel: 'User', // Free message only for Users
            content,
            type: type || 'text',
            mediaUrl
          });
          await message.save();

          const recipientId = conversation.participants.find(p => p.toString() !== senderId.toString());
          const recipientIdStr = recipientId ? recipientId.toString() : null;
          
          // Check if recipient is in the conversation room
          let isRecipientInConvRoom = false;
          if (recipientIdStr) {
            const recipientRoom = io.sockets.adapter.rooms.get(conversationId);
            const recipientPersonalSockets = io.sockets.adapter.rooms.get(`user_${recipientIdStr}`);
            isRecipientInConvRoom = recipientRoom && recipientPersonalSockets && 
              [...recipientPersonalSockets].some(sid => recipientRoom.has(sid));
          }

          let updatedConv = null;
          if (recipientIdStr) {
            if (isRecipientInConvRoom) {
              updatedConv = await Conversation.findByIdAndUpdate(conversationId, { 
                lastMessage: message._id,
                [`unreadCount.${recipientIdStr}`]: 0
              }, { new: true });
            } else {
              updatedConv = await Conversation.findByIdAndUpdate(conversationId, { 
                lastMessage: message._id,
                $inc: { [`unreadCount.${recipientIdStr}`]: 1 }
              }, { new: true });
            }
            try {
              const sseService = require('./services/sseService');
              sseService.notifyUser(recipientIdStr);
            } catch (sseErr) {
              console.error('SSE notify error in FREE send_message:', sseErr);
            }
          } else {
            updatedConv = await Conversation.findByIdAndUpdate(conversationId, { lastMessage: message._id }, { new: true });
          }

          console.log(`[Socket] Emitting receive_message (free) to room ${conversationId}`);
          io.to(conversationId).emit('receive_message', message);

          // Emit notification to recipient's personal room and push notification only if they're NOT in the conversation room
          if (recipientIdStr && !isRecipientInConvRoom) {
            io.to(`user_${recipientIdStr}`).emit('receive_message', message);
            PushService.sendPushNotification(recipientIdStr, {
              title: sender.name || 'Mingo',
              body: type === 'text' ? content : `Sent a ${type}`,
              data: { 
                url: `/chat?id=${conversationId}`,
                conversationId: conversationId.toString(),
                type: 'chat_message',
              },
            }).catch(err => console.error('[Chat] Free msg push error:', err.message));
          }

        // The chat session (and its timer) does NOT start on a free user
        // message. It starts when the listener replies (handled in the
        // paid path below). This way the user only gets one free message.
        return;
      }

      // --- BALANCE CHECK (after free messages used) ---
      if (isUserRole) {
        // Check if there's an active chat session
        const hasActiveSession = conversation.chatSession && conversation.chatSession.active;

        if (!hasActiveSession) {
          // Need to start a new session — check balance
          if (sender.coins < CHAT_COINS_PER_SESSION) {
            // Insufficient balance — send system message
            const systemMsg = new Message({
              conversationId,
              sender: null,
              senderModel: 'System',
              content: 'Please recharge to continue chatting.',
              type: 'system',
            });
            await systemMsg.save();
            await Conversation.findByIdAndUpdate(conversationId, { lastMessage: systemMsg._id });
            io.to(conversationId).emit('receive_message', systemMsg);
            // Also notify the user specifically for UI handling
            io.to(`user_${senderId}`).emit('insufficient_balance', {
              conversationId,
              requiredCoins: CHAT_COINS_PER_SESSION,
              currentCoins: sender.coins,
            });
            PushService.sendPushNotification(senderId, {
              title: 'Recharge to continue chatting',
              body: `Your chat needs ${CHAT_COINS_PER_SESSION} coins for the next session.`,
              data: { type: 'insufficient_balance', reason: 'chat_start', conversationId: conversationId.toString() },
            }).catch(err => console.error('[Chat] Insufficient-balance push failed:', err.message));
            return;
          }
          // User has balance but no session is active.
          // The session only starts once the LISTENER is actually online —
          // otherwise the second message is blocked (a session cannot begin
          // "live"). Online-ness is checked against the heartbeat key, the
          // maintained availability set AND the persistent DB flag, because
          // the heartbeat key alone has a short TTL and the app never sends
          // periodic heartbeats — a fully online listener would otherwise be
          // reported offline mid-chat and the user's message would be blocked.
          const userListener = conversation.participants.find(
            (p) => p.toString() !== senderId.toString()
          );
          const listenerOnline = userListener
            ? await isListenerActuallyOnline(userListener.toString())
            : false;
          if (!listenerOnline) {
            console.log(
              `[Socket] Blocking paid msg in conv ${conversationId}: listener ${userListener} is offline`
            );
            socket.emit('listener_offline', {
              conversationId,
              listenerId: userListener ? userListener.toString() : null,
            });
            return;
          }
        }
      }

      // --- LISTENER REPLIES ARE NEVER RESTRICTED -------------------------
      // The listener may send as many messages as they want at any time:
      // during the free phase (before any paid chat session starts), while a
      // session is active, and after a session has ended. Chat sessions are
      // started and billed only by the USER's messages, so an unlimited
      // listener reply stream can never trigger charges or start a session.

      // Save and send the message
      console.log(`[Socket] Saving message in conv ${conversationId} from ${senderId} (${senderModel})`);
      const message = new Message({
        conversationId,
        sender: senderId,
        senderModel: senderModel || (isUserRole ? 'User' : 'Listener'),
        content,
        type: type || 'text',
        mediaUrl,
        giftCount: data.giftCount || 1
      });
      await message.save();

      const recipientId = conversation.participants.find(p => p.toString() !== senderId.toString());
      const recipientIdStr = recipientId ? recipientId.toString() : null;
      
      // Determine if recipient is currently in the conversation room
      let isRecipientInConvRoom = false;
      if (recipientIdStr) {
        const recipientRoom = io.sockets.adapter.rooms.get(conversationId);
        const recipientPersonalSockets = io.sockets.adapter.rooms.get(`user_${recipientIdStr}`);
        isRecipientInConvRoom = recipientRoom && recipientPersonalSockets && 
          [...recipientPersonalSockets].some(sid => recipientRoom.has(sid));
      }

      let updatedConv = null;
      if (recipientIdStr) {
        if (isRecipientInConvRoom) {
          // Recipient is already in the chat — just update lastMessage, don't increment unread
          updatedConv = await Conversation.findByIdAndUpdate(conversationId, { 
            lastMessage: message._id,
            [`unreadCount.${recipientIdStr}`]: 0
          }, { new: true });
        } else {
          // Recipient is NOT in the chat — increment unread count
          updatedConv = await Conversation.findByIdAndUpdate(conversationId, { 
            lastMessage: message._id,
            $inc: { [`unreadCount.${recipientIdStr}`]: 1 }
          }, { new: true });
        }
        try {
          const sseService = require('./services/sseService');
          sseService.notifyUser(recipientIdStr);
        } catch (sseErr) {
          console.error('SSE notify error in send_message:', sseErr);
        }
      } else {
        updatedConv = await Conversation.findByIdAndUpdate(conversationId, { lastMessage: message._id }, { new: true });
      }
      
      // Emit to the conversation room (for people already in the chat)
      console.log(`[Socket] Emitting receive_message to room ${conversationId}`);
      io.to(conversationId).emit('receive_message', message);

      // Emit to recipient's personal room and push notification only if they're NOT in the conversation room
      if (recipientIdStr && !isRecipientInConvRoom) {
        io.to(`user_${recipientIdStr}`).emit('receive_message', message);
        
        // Send push notification so recipient is informed when not in conversation room
        PushService.sendPushNotification(recipientIdStr, {
          title: sender.name || 'Mingo',
          body: type === 'text' ? content : `Sent a ${type}`,
          data: { 
            url: `/chat?id=${conversationId}`,
            conversationId: conversationId.toString(),
            type: 'chat_message',
          },
        }).catch(err => console.error('[Chat] Message push error:', err.message));
      }

        // --- SESSION START ---
        // A chat session (and its timer) starts ONLY when the USER sends a
        // message with no active session (and enough coins). It does NOT start
        // on a listener reply — the listener's reply merely unlocks the user's
        // message box. The listener must be online for the user's message to
        // begin the session (guarded in the balance-check block above).
        const sessionData = conversation.chatSession;
        const needsNewSession = !sessionData || !sessionData.active;
        if (isUserRole && needsNewSession) {
          await startChatSession(conversation, senderId.toString());
        }

      } catch (error) {
        console.error('[Socket] send_message ERROR:', error);
        socket.emit('message_error', { error: 'Internal server error', details: error.message });
      }
    });

    socket.on('typing', (data) => {
      const { conversationId, userId } = data;
      socket.to(conversationId).emit('user_typing', { userId });
    });

    socket.on('stop_typing', (data) => {
      const { conversationId, userId } = data;
      socket.to(conversationId).emit('user_stop_typing', { userId });
    });

    // End chat session manually
    socket.on('end_chat_session', async (data) => {
      const { conversationId } = data;
      await endChatSession(conversationId);
    });

    socket.on('call_incoming', async (data) => {
      const { listenerId, callData } = data;
      if (callData && !callData.customRingtoneUrl) {
        try {
          const SystemSettings = require('./models/SystemSettings');
          const settings = await SystemSettings.getSettings();
          if (settings?.customRingtoneUrl) {
            callData.customRingtoneUrl = settings.customRingtoneUrl;
          }
        } catch (e) {
          console.error('[Socket] Error fetching custom ringtone for call_incoming:', e.message);
        }
      }

      // Resolve the caller's avatar photo server-side so the native call card
      // can show it (the client payload only carries gender/avatarIndex).
      if (callData && callData.callerId && !callData.callerPhoto) {
        try {
          const caller = await User.findById(callData.callerId).select('gender avatarIndex');
          if (caller) {
            callData.callerPhoto = getAvatarUrl(caller.gender, caller.avatarIndex);
          }
        } catch (e) {
          console.error('[Socket] Error resolving caller photo for call_incoming:', e.message);
        }
      }

      io.to(`user_${listenerId}`).emit('incoming_call', callData);
    });

    socket.on('call_accepted', async (data) => {
      const { userId, sessionId, roomId } = data;
      console.log(`[Socket] call_accepted event received for session: ${sessionId}, user: ${userId}`);
      try {
        const session = await Session.findById(sessionId);
        if (!session || session.status === 'cancelled' || session.status === 'completed') {
          console.log(`[Socket] Call accept failed: Session ${sessionId} is ${session?.status || 'not found'}`);
          socket.emit('call_validation_failed', { sessionId, reason: 'cancelled' });
          return;
        }

        // Check if the caller (user) is still online/connected to the socket
        const callerRooms = io.sockets.adapter.rooms.get(`user_${userId}`);
        if (!callerRooms || callerRooms.size === 0) {
          console.log(`[Socket] Call accept failed: User ${userId} is offline/disconnected.`);
          session.status = 'cancelled';
          await session.save();
          
          let listenerUserId = socket.userId || session.listenerId;
          if (listenerUserId) {
            await Listener.findOneAndUpdate({ userId: listenerUserId }, { isBusy: false, busySince: null });
            io.emit('listener_status_changed', { userId: listenerUserId, isOnline: true, isBusy: false });
            const sseService = require('./services/sseService');
            sseService.broadcastListenerStatus(listenerUserId, true, false, null);
            await redis.sadd(REDIS_KEYS.LISTENERS_AVAILABLE, listenerUserId.toString());
            await redis.del(REDIS_KEYS.LOCK(listenerUserId.toString()));
          }
          
          socket.emit('call_validation_failed', { sessionId, reason: 'user_offline' });
          return;
        }

        io.to(`user_${userId}`).emit('call_accepted', { sessionId, roomId });
      } catch (err) {
        console.error('[Socket] Error in call_accepted validation:', err.message);
        socket.emit('call_validation_failed', { sessionId, reason: 'error', message: err.message });
      }
    });

    socket.on('call_rejected', async (data) => {
      const { userId, sessionId, reason } = data;
      console.log(`[Socket] call_rejected received from listener. Caller user: ${userId}, Session: ${sessionId}`);
      io.to(`user_${userId}`).emit('call_rejected', { reason: reason || 'rejected' });
      try {
        if (sessionId) {
          // Nobody answered (listener's incoming-call card timed out) — record
          // it as a missed call so it shows up in both sides' history.
          const isNoAnswer = reason === 'timeout' || reason === 'no_answer';
          await Session.findByIdAndUpdate(sessionId, { status: isNoAnswer ? 'missed' : 'cancelled' });
        }
        let listenerUserId = socket.userId;
        if (!listenerUserId && sessionId) {
          const sess = await Session.findById(sessionId);
          if (sess) listenerUserId = sess.listenerId;
        }
        if (listenerUserId) {
          await Listener.findOneAndUpdate({ userId: listenerUserId }, { isBusy: false, busySince: null });
          io.emit('listener_status_changed', { userId: listenerUserId, isOnline: true, isBusy: false });
          const sseService = require('./services/sseService');
          sseService.broadcastListenerStatus(listenerUserId, true, false, null);
          await redis.sadd(REDIS_KEYS.LISTENERS_AVAILABLE, listenerUserId.toString());
          await redis.del(REDIS_KEYS.LOCK(listenerUserId.toString()));
        }
      } catch (err) {
        console.error('[Socket] Error handling call_rejected DB updates:', err.message);
      }
    });

    socket.on('call_cancelled', async (data) => {
      let { userId, sessionId, reason } = data;
      console.log(`[Socket] call_cancelled received from caller. Listener: ${userId}, Session: ${sessionId}`);
      
      try {
        let session = null;
        if (sessionId) {
          // The caller's ring timer gave up (no answer) — record as missed so
          // it shows up in both sides' history. Manual cancels stay 'cancelled'.
          const isNoAnswer = reason === 'timeout' || reason === 'no_answer';
          session = await Session.findByIdAndUpdate(
            sessionId,
            { status: isNoAnswer ? 'missed' : 'cancelled' },
            { new: true }
          );
        }
        
        // Extract listener's user ID from the active session if missing from data
        if (!userId && session) {
          userId = session.listenerId?.toString();
        }

        if (userId) {
          io.to(`user_${userId}`).emit('call_cancelled', { sessionId });

          // Push so the listener's device stops ringing even when the app is
          // backgrounded/killed — the native incoming-call card dismisses on
          // this event (see frontend IncomingCallNotificationService).
          const isNoAnswer = reason === 'timeout' || reason === 'no_answer' || session?.status === 'missed';
          let callerName = 'Someone';
          if (session?.userId) {
            try {
              const User = require('./models/userModel');
              const callerUser = await User.findById(session.userId).select('name');
              if (callerUser?.name) callerName = callerUser.name;
            } catch (e) {}
          }

          try {
            PushService.sendPushNotification(userId, {
              title: isNoAnswer ? 'Missed Call' : '',
              body: isNoAnswer ? `Missed call from ${callerName}` : '',
              data: {
                type: 'call_cancelled',
                callId: (sessionId || '').toString(),
                isMissed: isNoAnswer ? 'true' : 'false',
              },
            });
          } catch (pushErr) {
            console.error('[Socket] call_cancelled push failed:', pushErr.message);
          }

          await Listener.findOneAndUpdate({ userId: userId }, { isBusy: false, busySince: null });
          io.emit('listener_status_changed', { userId: userId, isOnline: true, isBusy: false });
          const sseService = require('./services/sseService');
          sseService.broadcastListenerStatus(userId, true, false, null);
          await redis.sadd(REDIS_KEYS.LISTENERS_AVAILABLE, userId.toString());
          await redis.del(REDIS_KEYS.LOCK(userId.toString()));
        }
      } catch (err) {
        console.error('[Socket] Error handling call_cancelled DB updates:', err.message);
      }
    });

    socket.on('call_ended', async (data) => {
      const { roomId, sessionId } = data;
      // Broadcast to room
      if (roomId) io.to(roomId).emit('call_ended', data);
      
      // Also try to end session properly if sessionId provided
      if (sessionId) {
        try {
          const session = await Session.findById(sessionId);
          if (session && session.status === 'active') {
            session.status = 'completed';
            session.endTime = new Date();
            await session.save();
            stopCallBillingTimer(sessionId);
            if (session.roomId) stopCallBillingTimer(session.roomId);

            // Increment listener call counters
            await CallService.incrementListenerCounters(session.listenerId, session.callType);

            // Notify both user rooms
            io.to(`user_${session.userId}`).emit('call_ended', { sessionId });
            io.to(`user_${session.listenerId}`).emit('call_ended', { sessionId });
            
            // Reset listener busy status
            await Listener.findOneAndUpdate({ userId: session.listenerId }, { isBusy: false, busySince: null });
            io.emit('listener_status_changed', { userId: session.listenerId.toString(), isOnline: true, isBusy: false });
            const sseService = require('./services/sseService');
            sseService.broadcastListenerStatus(session.listenerId.toString(), true, false, null);
            await redis.sadd(REDIS_KEYS.LISTENERS_AVAILABLE, session.listenerId.toString());
            await redis.del(REDIS_KEYS.LOCK(session.listenerId.toString()));
          }
        } catch (err) {
          console.error('[Socket] Error handling call_ended:', err.message);
        }
      }
    });

    // ─── Call Billing Events ──────────────────────────────────
    // Frontend emits this once both users join the call room
    socket.on('start_call_billing', async (data) => {
      const { sessionId } = data;
      if (!sessionId) return;
      console.log(`[CallBilling] Starting billing for session ${sessionId}`);
      await startCallBillingTimer(sessionId);
    });

    // Frontend emits this when call ends (belt-and-suspenders with endCall API)
    socket.on('stop_call_billing', async (data) => {
      const { sessionId } = data;
      if (!sessionId) return;
      console.log(`[CallBilling] Stopping billing for session ${sessionId}`);
      stopCallBillingTimer(sessionId);
    });

    // ─── Call Upgrade (Audio -> Video) ─────────────────────────
    socket.on('request_call_upgrade', async (data) => {
      const { sessionId, roomId } = data;
      console.log(`[Socket] request_call_upgrade for session: ${sessionId}`);
      try {
        const session = await Session.findById(sessionId);
        if (!session || session.status !== 'active') {
          socket.emit('call_upgrade_failed', { sessionId, reason: 'session_inactive' });
          return;
        }

        // The paying user is ALWAYS session.userId — billing deducts from them
        // regardless of who initiated the request. A converted call bills at
        // the video rate (40 coins/min), so refuse the upgrade up front when
        // they can't afford a single video minute. Otherwise the call would
        // just be auto-ended on the first video billing tick — prompt the
        // payer to recharge instead.
        const payingUser = await User.findById(session.userId);
        if (!payingUser || payingUser.coins < VIDEO_COINS_PER_MIN) {
          socket.emit('call_upgrade_failed', {
            sessionId: session._id.toString(),
            reason: 'insufficient_balance',
            requiredCoins: VIDEO_COINS_PER_MIN,
            currentCoins: payingUser ? payingUser.coins : 0,
            message: `You need at least ${VIDEO_COINS_PER_MIN} coins to switch to a video call. Please recharge.`,
          });
          return;
        }

        // Always derive recipient from the session — the client-supplied
        // targetUserId can be stale or point at the caller's own ID.
        const callerUserId = socket.userId;
        const recipientId = (callerUserId && session.userId.toString() === callerUserId.toString())
          ? session.listenerId.toString()
          : session.userId.toString();

        console.log(`[Socket] Upgrade request from ${callerUserId} to ${recipientId}`);

        io.to(`user_${recipientId}`).emit('call_upgrade_requested', {
          sessionId: session._id.toString(),
          roomId: roomId || session.roomId,
          requestedBy: callerUserId,
          toCallType: 'video'
        });
      } catch (err) {
        console.error('[Socket] Error in request_call_upgrade:', err.message);
      }
    });

    socket.on('respond_call_upgrade', async (data) => {
      const { sessionId, roomId, accepted } = data;
      console.log(`[Socket] respond_call_upgrade for session ${sessionId}, accepted: ${accepted}`);
      try {
        const session = await Session.findById(sessionId);
        if (!session || session.status !== 'active') return;

        if (accepted) {
          // Re-check the paying user's balance at ACCEPT time too — it may
          // have dropped below one video minute since the request (billing
          // tick, gift, balance spent elsewhere). Refuse the conversion so the
          // call isn't converted and then auto-ended on the first video
          // minute. The payer gets the recharge prompt, the other side is
          // informed — and the audio call keeps running.
          const payingUser = await User.findById(session.userId);
          if (!payingUser || payingUser.coins < VIDEO_COINS_PER_MIN) {
            const failedPayload = {
              sessionId: session._id.toString(),
              reason: 'insufficient_balance',
              requiredCoins: VIDEO_COINS_PER_MIN,
              currentCoins: payingUser ? payingUser.coins : 0,
              message: `You need at least ${VIDEO_COINS_PER_MIN} coins to switch to a video call. Please recharge.`,
            };
            io.to(`user_${session.userId}`).emit('call_upgrade_failed', failedPayload);
            io.to(`user_${session.listenerId}`).emit('call_upgrade_failed', failedPayload);
            return;
          }

          if (!session.initialCallType) {
            session.initialCallType = session.callType || 'audio';
          }
          session.callType = 'video';
          session.isConverted = true;
          session.convertedAt = new Date();
          await session.save();

          // Realign billing so the video minute boundaries start at the
          // conversion moment: the old timer's 60s cadence was anchored to the
          // call start, which would bill the first video minute up to 60s late
          // (or never, if the call ends before the next tick). Stopping and
          // restarting deducts the first video minute immediately and anchors
          // subsequent ticks at convertedAt.
          try {
            stopCallBillingTimer(session._id.toString());
            if (session.roomId) stopCallBillingTimer(session.roomId);
            await startCallBillingTimer(session._id.toString(), { restart: true });
          } catch (billingErr) {
            console.error('[Socket] Failed to restart billing after video upgrade:', billingErr.message);
          }

          console.log(`[Socket] Session ${sessionId} upgraded to VIDEO!`);

          const agoraPayload = CallService.getAgoraCallPayload(session.roomId, 'video');

          const payload = {
            sessionId: session._id.toString(),
            roomId: session.roomId,
            callType: 'video',
            isConverted: true,
            message: 'Call upgraded to video',
            ...agoraPayload
          };

          io.to(`user_${session.userId}`).emit('call_upgrade_accepted', payload);
          io.to(`user_${session.listenerId}`).emit('call_upgrade_accepted', payload);
        } else {
          const declinerId = socket.userId;
          const callerId = (declinerId && session.userId.toString() === declinerId.toString())
            ? session.listenerId.toString()
            : session.userId.toString();
          io.to(`user_${callerId}`).emit('call_upgrade_declined', {
            sessionId: session._id.toString(),
            message: 'The upgrade to video call was declined.'
          });
        }
      } catch (err) {
        console.error('[Socket] Error in respond_call_upgrade:', err.message);
      }
    });

    // Random Call Matching
    socket.on('request_random_call', async (data) => {
      const { role } = data;
      const userId = socket.userId;
      if (!userId) return;

      console.log(`Random call requested by ${role}: ${userId}`);

      if (role === 'USER') {
        // Check balance first
        const user = await User.findById(userId);
        if (!user || user.coins < 10) {
          socket.emit('insufficient_balance', { requiredCoins: 10, currentCoins: user?.coins || 0 });
          PushService.sendPushNotification(userId, {
            title: 'Recharge to start a call',
            body: 'You need at least 10 coins to start an audio call.',
            data: { type: 'insufficient_balance', reason: 'random_call_start', callType: 'audio' },
          }).catch(err => console.error('[Socket] Insufficient-balance push failed:', err.message));
          return;
        }

        // Match with any available approved, online and free listener
        const availableListeners = await Listener.find({
          status: 'approved',
          isOnline: true,
          isBusy: false,
          userId: { $ne: userId }
        });

        if (availableListeners.length > 0) {
          const randomIndex = Math.floor(Math.random() * availableListeners.length);
          const matchedListener = availableListeners[randomIndex];
          const matchedListenerId = matchedListener.userId.toString();

          const listenerUser = await User.findById(matchedListenerId);

          console.log(`[Socket] Random match found: User ${userId} <-> Listener ${matchedListenerId}`);

          socket.emit('random_match_found', {
            partnerId: matchedListenerId,
            partnerName: listenerUser?.name || 'Listener',
            partnerAvatar: matchedListener?.avatarIndex || listenerUser?.avatarIndex || '0',
            partnerGender: matchedListener?.gender || listenerUser?.gender || 'Female',
            role: 'LISTENER'
          });

          io.to(`user_${matchedListenerId}`).emit('random_match_found', {
            partnerId: userId,
            partnerName: user.name || 'User',
            partnerAvatar: user.avatarIndex || '0',
            partnerGender: user.gender || 'Female',
            role: 'USER'
          });
        } else {
          socket.emit('searching_random', { message: 'Searching for an online listener...' });
          
          // Auto-timeout after 60 seconds (fall back to queue or timeout immediately)
          // We will timeout immediately if no listeners are online at all
          socket.emit('random_search_timeout');
        }
      } else {
        // Listener looking for user
        if (randomUsers.size > 0) {
          const matchedUserId = [...randomUsers][0];
          randomUsers.delete(matchedUserId);
          if (randomSearchTimeouts[matchedUserId]) {
            clearTimeout(randomSearchTimeouts[matchedUserId]);
            delete randomSearchTimeouts[matchedUserId];
          }

          const user = await User.findById(matchedUserId);
          const listener = await Listener.findOne({ userId });
          const listenerUser = await User.findById(userId);

          socket.emit('random_match_found', {
            partnerId: matchedUserId,
            partnerName: user?.name || 'User',
            partnerAvatar: user?.avatarIndex || '0',
            partnerGender: user?.gender || 'Female',
            role: 'USER'
          });

          io.to(`user_${matchedUserId}`).emit('random_match_found', {
            partnerId: userId,
            partnerName: listenerUser?.name || 'Listener',
            partnerAvatar: listener?.avatarIndex || '0',
            partnerGender: listener?.gender || 'Female',
            role: 'LISTENER'
          });
        } else {
          randomListeners.add(userId);
          socket.emit('searching_random', { message: 'Waiting for a user to connect...' });

          // Auto-timeout after 60 seconds
          randomSearchTimeouts[userId] = setTimeout(() => {
            randomListeners.delete(userId);
            socket.emit('random_search_timeout');
            delete randomSearchTimeouts[userId];
          }, 60000);
        }
      }
    });

    socket.on('cancel_random_search', () => {
      const userId = socket.userId;
      if (!userId) return;
      randomUsers.delete(userId);
      randomListeners.delete(userId);
      if (randomSearchTimeouts[userId]) {
        clearTimeout(randomSearchTimeouts[userId]);
        delete randomSearchTimeouts[userId];
      }
      console.log(`Random search cancelled by ${userId}`);
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      if (socket.userId) {
        if (socket.connectTime) {
          const durationSeconds = Math.floor((Date.now() - socket.connectTime) / 1000);
          if (durationSeconds > 0) {
            User.findByIdAndUpdate(socket.userId, { $inc: { totalTimeSpent: durationSeconds } })
              .catch(err => console.error('Failed to update totalTimeSpent:', err.message));
          }
        }
        randomUsers.delete(socket.userId);
        randomListeners.delete(socket.userId);
        if (randomSearchTimeouts[socket.userId]) {
          clearTimeout(randomSearchTimeouts[socket.userId]);
          delete randomSearchTimeouts[socket.userId];
        }
        
        // End active call/chat sessions on disconnect (if any) without marking listener offline
        const disconnectedUserId = socket.userId;
        if (disconnectedUserId) {
          const userSockets = io ? io.sockets.adapter.rooms.get(`user_${disconnectedUserId}`) : null;
          if (!userSockets || userSockets.size === 0) {
            userOfflineSince[disconnectedUserId.toString()] = Date.now();
          }
        }
        (async () => {
          try {
            // Note: a listener is not marked offline immediately on disconnect —
            // a grace timer is scheduled instead, so transient drops and quick
            // reconnects never flip them offline. If the app was force-closed
            // (swiped from RAM) it never reconnects, and the timer marks them
            // offline automatically (see step 4 below).

            // 2. Auto-end active calls (immediately) - only audio and video calls, not chat sessions
            const activeCall = await Session.findOne({
              $or: [{ userId: disconnectedUserId }, { listenerId: disconnectedUserId }],
              status: 'active',
              callType: { $in: ['audio', 'video'] }
            });
            if (activeCall) {
              console.log(`[Socket] Auto-ending active call ${activeCall._id} on participant disconnect: ${disconnectedUserId}`);
              activeCall.status = 'completed';
              activeCall.endTime = new Date();
              await activeCall.save();
              stopCallBillingTimer(activeCall._id.toString());
              stopCallBillingTimer(activeCall.roomId);

              // Increment listener call counters
              await CallService.incrementListenerCounters(activeCall.listenerId, activeCall.callType);

              // Notify both participants
              io.to(`user_${activeCall.userId}`).emit('call_ended', { sessionId: activeCall._id.toString() });
              io.to(`user_${activeCall.listenerId}`).emit('call_ended', { sessionId: activeCall._id.toString() });
              
              // Reset listener busy status and release lock
              const listenerIdStr = activeCall.listenerId.toString();
              await Listener.findOneAndUpdate({ userId: listenerIdStr }, { isBusy: false, busySince: null });
              const listenerDoc = await Listener.findOne({ userId: listenerIdStr }).select('isOnline');
              const listenerIsOnline = listenerDoc ? listenerDoc.isOnline : true;
              io.emit('listener_status_changed', { userId: listenerIdStr, isOnline: listenerIsOnline, isBusy: false });
              const sseService = require('./services/sseService');
              sseService.broadcastListenerStatus(listenerIdStr, listenerIsOnline, false, null);
              if (listenerIsOnline) {
                await redis.sadd(REDIS_KEYS.LISTENERS_AVAILABLE, listenerIdStr);
              }
              await redis.del(REDIS_KEYS.LOCK(listenerIdStr));
            }

            // 3. Notify other participant that user went offline
            const activeChatConvs = await Conversation.find({
              participants: disconnectedUserId,
              'chatSession.active': true
            });
            if (activeChatConvs.length > 0) {
              console.log(`[Socket] User ${disconnectedUserId} disconnected with ${activeChatConvs.length} active chat(s).`);
              
              // Notify the other participant that user left the chat page
              for (const conv of activeChatConvs) {
                const otherParticipant = conv.participants.find(p => p.toString() !== disconnectedUserId.toString());
                if (otherParticipant) {
                  io.to(`user_${otherParticipant}`).emit('chat_user_offline', {
                    conversationId: conv._id.toString(),
                    userId: disconnectedUserId,
                    message: 'User left the chat page.',
                  });
                }
              }
            }

            // 4. Online/Offline status is strictly managed by the listener via explicit "Go Offline" button.
            //    Closing or backgrounding the app MUST NOT mark the listener offline automatically.
            console.log(`[Socket] User ${disconnectedUserId} socket disconnected. Listener online status preserved.`);
          } catch (e) {
            console.error('Error on disconnect cleanup:', e.message);
          }
        })();
      }
    });
  });
};

/**
 * Determine whether a listener is genuinely online right now.
 *
 * The Redis heartbeat key (online:<userId>) alone is not a reliable signal:
 * it has a 30s TTL and is only refreshed when the listener calls
 * /listeners/heartbeat, which the mobile app never does. A listener can
 * therefore be fully online (socket connected, DB isOnline true) while the
 * heartbeat key has already expired. Check, in order of freshness: the
 * heartbeat key, the maintained availability set, then the DB flag.
 */
async function isListenerActuallyOnline(userIdStr) {
  try {
    if (await redis.exists(REDIS_KEYS.ONLINE(userIdStr))) return true;
  } catch (e) {
    console.error('[Socket] ONLINE key presence check failed:', e.message);
  }
  try {
    if (await redis.sismember(REDIS_KEYS.LISTENERS_AVAILABLE, userIdStr)) return true;
  } catch (e) {
    console.error('[Socket] LISTENERS_AVAILABLE presence check failed:', e.message);
  }
  const listener = await Listener.findOne({ userId: userIdStr }).select('isOnline');
  return !!(listener && listener.isOnline);
}

/**
 * Start a paid chat session (first 5-minute block) for a conversation.
 * Deducts the first block from the user, marks the session active, emits
 * chat_session_started, and starts the recurring renewal timer.
 * Returns the new chatSession object, or null if the user can't afford it.
 */
async function startChatSession(conversation, userParticipantId) {
  const conversationId = conversation._id.toString();

  // Guard against a concurrent message starting a second session: re-check the
  // persisted state in case another in-flight request already activated it.
  const freshConversation = await Conversation.findById(conversation._id);
  if (freshConversation && freshConversation.chatSession && freshConversation.chatSession.active) {
    return null;
  }

  const listenerUserId = conversation.participants.find(
    (p) => p.toString() !== userParticipantId.toString()
  );
  if (!listenerUserId) return null;

  const userParticipant = await User.findById(userParticipantId);
  if (!userParticipant || userParticipant.coins < CHAT_COINS_PER_SESSION) {
    return null;
  }

  // Deduct coins for the first 5-minute block
  userParticipant.coins -= CHAT_COINS_PER_SESSION;
  await userParticipant.save();

  // Create the chat Session document
  const Session = require('./models/sessionModel');
  const { v4: uuidv4 } = require('uuid');
  let chatSessionDoc = null;
  try {
    chatSessionDoc = await Session.create({
      userId: userParticipantId,
      listenerId: listenerUserId,
      roomId: `chat_${uuidv4()}`,
      callType: 'chat',
      startTime: new Date(),
      status: 'active',
      coinsDeducted: CHAT_COINS_PER_SESSION,
      listenerEarnings: 0,
    });
  } catch (sessErr) {
    console.error('Error creating chat Session document:', sessErr);
  }

  // Record transaction
  await Transaction.create({
    userId: userParticipantId,
    type: 'call_debit',
    amount: 0,
    coins: -CHAT_COINS_PER_SESSION,
    description: 'Chat session - 5 min block',
    status: 'completed',
    metadata: { sessionId: chatSessionDoc ? chatSessionDoc._id : null },
  });

  conversation.chatSession = {
    active: true,
    startedBy: userParticipantId,
    startTime: new Date(),
    lastDeductionTime: new Date(),
    totalCoinsDeducted: CHAT_COINS_PER_SESSION,
    sessionId: chatSessionDoc ? chatSessionDoc._id : null,
  };
  await conversation.save();

  // Increment listener's chat/session counters, but do NOT credit earnings yet
  const listenerProfile = await Listener.findOne({ userId: listenerUserId });
  if (listenerProfile) {
    listenerProfile.totalChats = (listenerProfile.totalChats || 0) + 1;
    listenerProfile.todayChats = (listenerProfile.todayChats || 0) + 1;
    listenerProfile.totalSessions = (listenerProfile.totalSessions || 0) + 1;
    await listenerProfile.save();
  }

  // Notify user of balance update
  if (io) {
    io.to(`user_${userParticipantId}`).emit('balance_updated', {
      coins: userParticipant.coins,
      deducted: CHAT_COINS_PER_SESSION,
      reason: 'chat_session_start',
    });

    // Emit chat_session_started to both participants
    io.to(conversationId).emit('chat_session_started', {
      conversationId,
      chatSession: conversation.chatSession,
    });
    conversation.participants.forEach(p => {
      io.to(`user_${p}`).emit('chat_session_started', {
        conversationId,
        chatSession: conversation.chatSession,
      });
    });

    // Start a timer for the next 5-minute block
    startChatSessionTimer(conversationId, userParticipantId.toString());
  }

  return conversation.chatSession;
}

/**
 * Start a recurring timer that deducts coins every 5 minutes for an active chat session.
 */
function startChatSessionTimer(conversationId, userId) {
  // Clear any existing timer for this conversation
  if (chatSessionTimers[conversationId]) {
    clearInterval(chatSessionTimers[conversationId]);
  }

  chatSessionTimers[conversationId] = setInterval(async () => {
    try {
      const conversation = await Conversation.findById(conversationId);
      if (!conversation || !conversation.chatSession || !conversation.chatSession.active) {
        clearInterval(chatSessionTimers[conversationId]);
        delete chatSessionTimers[conversationId];
        return;
      }

      const user = await User.findById(userId);
      
      // Check if user is online when the 5-minute block ends
      const userSockets = io ? io.sockets.adapter.rooms.get(`user_${userId}`) : null;
      const isUserOnline = userSockets && userSockets.size > 0;

      if (!isUserOnline || !user || user.coins < CHAT_COINS_PER_SESSION) {
        // End session if offline or insufficient balance
        await endChatSession(conversationId);

        // Send system message
        const content = !isUserOnline ? 'Session ended — user left the chat page.' : 'Please recharge to continue chatting.';
        const systemMsg = new Message({
          conversationId,
          sender: null,
          senderModel: 'System',
          content,
          type: 'system',
        });
        await systemMsg.save();
        await Conversation.findByIdAndUpdate(conversationId, { lastMessage: systemMsg._id });

        if (io) {
          io.to(conversationId).emit('receive_message', systemMsg);
          if (user && user.coins < CHAT_COINS_PER_SESSION) {
            io.to(`user_${userId}`).emit('insufficient_balance', {
              conversationId,
              requiredCoins: CHAT_COINS_PER_SESSION,
              currentCoins: user.coins,
            });
            PushService.sendPushNotification(userId, {
              title: 'Chat ended — recharge to continue',
              body: `Your chat ended because you need ${CHAT_COINS_PER_SESSION} more coins.`,
              data: { type: 'insufficient_balance', reason: 'chat_renewal', conversationId: conversationId.toString() },
            }).catch(err => console.error('[Chat] Insufficient-balance push failed:', err.message));

            const listenerId = conversation.participants.find(p => p.toString() !== userId.toString());
            if (listenerId) {
              PushService.sendPushNotification(listenerId, {
                title: 'Chat ended — user ran out of balance',
                body: 'The chat ended because the user ran out of coins.',
                data: { type: 'chat_ended', reason: 'user_balance_depleted', conversationId: conversationId.toString() },
              }).catch(err => console.error('[Chat] Insufficient-balance push to listener failed:', err.message));
            }
          }
          // endChatSession (called above) already emits chat_session_ended with
          // the full session summary to the room and both participants.
        }
        return;
      }

      // Deduct coins for next 5-minute block
      user.coins -= CHAT_COINS_PER_SESSION;
      await user.save();

      await Transaction.create({
        userId: userId,
        type: 'call_debit',
        amount: 0,
        coins: -CHAT_COINS_PER_SESSION,
        description: 'Chat session - 5 min block',
        status: 'completed',
        metadata: { sessionId: conversation.chatSession.sessionId },
      });

      conversation.chatSession.lastDeductionTime = new Date();
      conversation.chatSession.totalCoinsDeducted += CHAT_COINS_PER_SESSION;
      await conversation.save();

      if (conversation.chatSession.sessionId) {
        try {
          const Session = require('./models/sessionModel');
          await Session.findByIdAndUpdate(conversation.chatSession.sessionId, {
            $inc: {
              coinsDeducted: CHAT_COINS_PER_SESSION,
            }
          });
        } catch (sessUpdErr) {
          console.error('Error updating chat session doc on renewal:', sessUpdErr);
        }
      }

      if (io) {
        io.to(`user_${userId}`).emit('balance_updated', {
          coins: user.coins,
          deducted: CHAT_COINS_PER_SESSION,
          reason: 'chat_session_renewal',
        });

        io.to(conversationId).emit('chat_session_renewed', {
          conversationId,
          chatSession: conversation.chatSession,
        });
        conversation.participants.forEach(p => {
          io.to(`user_${p}`).emit('chat_session_renewed', {
            conversationId,
            chatSession: conversation.chatSession,
          });
        });
      }
    } catch (error) {
      console.error('Chat session timer error:', error);
    }
  }, CHAT_SESSION_DURATION);
}

/**
 * End an active chat session and clean up its timer.
 */
async function endChatSession(conversationId) {
  try {
    if (chatSessionTimers[conversationId]) {
      clearInterval(chatSessionTimers[conversationId]);
      delete chatSessionTimers[conversationId];
    }
    if (chatSessionOfflineCheckers[conversationId]) {
      clearInterval(chatSessionOfflineCheckers[conversationId]);
      delete chatSessionOfflineCheckers[conversationId];
    }

    const conversationBefore = await Conversation.findById(conversationId);
    let endedSessionSummary = null;
    if (conversationBefore && conversationBefore.chatSession && conversationBefore.chatSession.sessionId) {
      try {
        const Session = require('./models/sessionModel');
        const endTime = new Date();
        const startTime = conversationBefore.chatSession.startTime || conversationBefore.createdAt;
        const durationMs = endTime - startTime;
        
        // Calculate units billed based on actual coins deducted (at least 1 block)
        const coinsDeductedObj = conversationBefore.chatSession.totalCoinsDeducted || CHAT_COINS_PER_SESSION;
        const unitsBilled = Math.ceil(coinsDeductedObj / CHAT_COINS_PER_SESSION);
        
        // Treat 5 minutes as the unit for session duration
        const durationMinutesBilled = unitsBilled * 5;
        
        let chatPayout = CHAT_LISTENER_PAYOUT;
        try {
          const SystemSettings = require('./models/SystemSettings');
          const settings = await SystemSettings.findOne();
          if (settings && settings.chatPayoutRate !== undefined) {
            chatPayout = settings.chatPayoutRate;
          }
        } catch (e) {
          console.error('Error fetching chatPayoutRate:', e);
        }

        const payoutAmountBilled = unitsBilled * chatPayout;

        const revenue = coinsDeductedObj * 0.5; // 1 coin = Rs 0.50
        const platformProfit = revenue - payoutAmountBilled;

        const updatedSession = await Session.findByIdAndUpdate(
          conversationBefore.chatSession.sessionId,
          {
            status: 'completed',
            endTime,
            duration: durationMinutesBilled,
            coinsDeducted: coinsDeductedObj,
            listenerEarnings: payoutAmountBilled,
            platformProfit: platformProfit
          },
          { new: true }
        );
        if (updatedSession) {
          endedSessionSummary = {
            sessionId: updatedSession._id,
            status: updatedSession.status,
            duration: updatedSession.duration,
            coinsDeducted: updatedSession.coinsDeducted,
            startTime: updatedSession.startTime,
            endTime: updatedSession.endTime,
          };
        }

        // Find which participant is the listener
        let listenerId = conversationBefore.participants.find(p => p.toString() !== conversationBefore.chatSession.startedBy?.toString());
        if (!listenerId) {
          for (const pId of conversationBefore.participants) {
            const isL = await Listener.exists({ userId: pId });
            if (isL) {
              listenerId = pId;
              break;
            }
          }
        }

        if (listenerId) {
          const listenerProfile = await Listener.findOne({ userId: listenerId });
          if (listenerProfile) {
            listenerProfile.earnings += payoutAmountBilled;
            listenerProfile.todayEarnings += payoutAmountBilled;
            await listenerProfile.save();

            // Record transaction for listener
            await Transaction.create({
              userId: listenerId,
              type: 'call_credit',
              amount: payoutAmountBilled,
              coins: 0,
              description: `Chat session earnings - ${durationMinutesBilled} min`,
              status: 'completed',
              metadata: { conversationId, sessionId: conversationBefore.chatSession.sessionId },
            });
          }
        }
      } catch (sessEndErr) {
        console.error('Error ending chat Session document:', sessEndErr);
      }
    }

    const conversation = await Conversation.findByIdAndUpdate(
      conversationId,
      { 'chatSession.active': false },
      { new: true }
    );

    if (conversation && io) {
      // Attach the freshly-computed session summary (duration / coins / time)
      // so BOTH chat pages can render the "Session ended" panel with the real
      // data immediately — no need to close and reopen the chat.
      const endedPayload = { conversationId, session: endedSessionSummary };
      io.to(conversationId).emit('chat_session_ended', endedPayload);
      conversation.participants.forEach(p => {
        io.to(`user_${p}`).emit('chat_session_ended', endedPayload);
      });
    }
  } catch (error) {
    console.error('Error ending chat session:', error);
  }
}

/**
 * Check if the active chat session has expired, and if so, auto-ends it.
 * Otherwise, resumes/starts the timer for the remaining time of the current block.
 */
async function syncAndResumeChatSession(conversationId) {
  try {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation || !conversation.chatSession || !conversation.chatSession.active) {
      return;
    }

    const { startTime, totalCoinsDeducted, startedBy } = conversation.chatSession;
    if (!startTime || !totalCoinsDeducted || !startedBy) {
      return;
    }

    const paidBlocks = Math.ceil(totalCoinsDeducted / CHAT_COINS_PER_SESSION);
    const paidDuration = paidBlocks * CHAT_SESSION_DURATION;
    const expirationTime = new Date(startTime).getTime() + paidDuration;

    if (Date.now() >= expirationTime) {
      console.log(`[Socket] Active chat session for conv ${conversationId} has expired. Auto-ending.`);
      await endChatSession(conversationId);
      
      const systemMsg = new Message({
        conversationId,
        sender: null,
        senderModel: 'System',
        content: 'Session ended.',
        type: 'system',
      });
      await systemMsg.save();
      await Conversation.findByIdAndUpdate(conversationId, { lastMessage: systemMsg._id });
      if (io) {
        io.to(conversationId).emit('receive_message', systemMsg);
      }
    } else {
      if (!chatSessionTimers[conversationId]) {
        console.log(`[Socket] Resuming active chat session timer for conv ${conversationId}.`);
        const remainingTime = expirationTime - Date.now();
        
        chatSessionTimers[conversationId] = setTimeout(async () => {
          try {
            delete chatSessionTimers[conversationId];
            
            const freshConv = await Conversation.findById(conversationId);
            if (!freshConv || !freshConv.chatSession || !freshConv.chatSession.active) {
              return;
            }

            const user = await User.findById(startedBy);
            const userSockets = io ? io.sockets.adapter.rooms.get(`user_${startedBy}`) : null;
            const isUserOnline = userSockets && userSockets.size > 0;

            if (!isUserOnline || !user || user.coins < CHAT_COINS_PER_SESSION) {
              await endChatSession(conversationId);
              const content = !isUserOnline ? 'Session ended — user left the chat page.' : 'Please recharge to continue chatting.';
              const systemMsg = new Message({
                conversationId,
                sender: null,
                senderModel: 'System',
                content,
                type: 'system',
              });
              await systemMsg.save();
              await Conversation.findByIdAndUpdate(conversationId, { lastMessage: systemMsg._id });
              if (io) {
                io.to(conversationId).emit('receive_message', systemMsg);
                if (user && user.coins < CHAT_COINS_PER_SESSION) {
                  io.to(`user_${startedBy}`).emit('insufficient_balance', {
                    conversationId,
                    requiredCoins: CHAT_COINS_PER_SESSION,
                    currentCoins: user.coins,
                  });
                  PushService.sendPushNotification(startedBy, {
                    title: 'Chat ended — recharge to continue',
                    body: `Your chat ended because you need ${CHAT_COINS_PER_SESSION} more coins.`,
                    data: { type: 'insufficient_balance', reason: 'chat_renewal', conversationId: conversationId.toString() },
                  }).catch(err => console.error('[Chat] Insufficient-balance push failed:', err.message));
                }
              }
            } else {
              user.coins -= CHAT_COINS_PER_SESSION;
              await user.save();

              await Transaction.create({
                userId: startedBy,
                type: 'call_debit',
                amount: 0,
                coins: -CHAT_COINS_PER_SESSION,
                description: 'Chat session - 5 min block',
                status: 'completed',
                metadata: { sessionId: freshConv.chatSession.sessionId },
              });

              freshConv.chatSession.lastDeductionTime = new Date();
              freshConv.chatSession.totalCoinsDeducted += CHAT_COINS_PER_SESSION;
              await freshConv.save();

              if (freshConv.chatSession.sessionId) {
                const Session = require('./models/sessionModel');
                await Session.findByIdAndUpdate(freshConv.chatSession.sessionId, {
                  $inc: { coinsDeducted: CHAT_COINS_PER_SESSION }
                }).catch(err => console.error('Error updating chat session doc on renewal:', err));
              }

              if (io) {
                io.to(`user_${startedBy}`).emit('balance_updated', {
                  coins: user.coins,
                  deducted: CHAT_COINS_PER_SESSION,
                  reason: 'chat_session_renewal',
                });
                io.to(conversationId).emit('chat_session_renewed', {
                  conversationId,
                  chatSession: freshConv.chatSession,
                });
                freshConv.participants.forEach(p => {
                  io.to(`user_${p}`).emit('chat_session_renewed', {
                    conversationId,
                    chatSession: freshConv.chatSession,
                  });
                });
              }

              startChatSessionTimer(conversationId, startedBy.toString());
            }
          } catch (err) {
            console.error('Error in resumed chat session timeout:', err);
          }
        }, remainingTime);
      }
    }
  } catch (err) {
    console.error('Error in syncAndResumeChatSession:', err);
  }
}

// ─── Call Billing Timer Functions ──────────────────────────────
const mongoose = require('mongoose');

/**
 * Start per-minute billing for an active call session.
 * Deducts coins every 60 seconds, emits balance updates,
 * warns on low balance, and auto-ends when balance is 0.
 */
async function startCallBillingTimer(sessionId, options = {}) {
  const { restart = false } = options;
  if (callBillingTimers[sessionId]) return;

  let realSessionId = sessionId;
  if (!mongoose.Types.ObjectId.isValid(sessionId)) {
    const found = await Session.findOne({ roomId: sessionId }).select('_id');
    if (!found) return;
    realSessionId = found._id.toString();
    if (callBillingTimers[realSessionId]) return;
    sessionId = realSessionId;
  }

  let session;
  if (restart) {
    // Restart after an audio→video conversion: the old timer (anchored to the
    // call start) was stopped, and this fresh timer anchors the video minute
    // boundaries to the conversion moment. lastDeductionTime is already set,
    // so skip the idempotency guard that prevents double-starts.
    session = await Session.findById(realSessionId);
    if (!session || session.status !== 'active') return;
  } else {
    session = await Session.findOneAndUpdate(
      { _id: realSessionId, status: 'active', lastDeductionTime: null },
      { $set: { lastDeductionTime: new Date() } },
      { new: true }
    );
    if (!session) return;
  }

  const isVideo = session.callType === 'video';
  const coinsPerMin = isVideo ? VIDEO_COINS_PER_MIN : AUDIO_COINS_PER_MIN;
  
  let payoutPerMin = isVideo ? VIDEO_PAYOUT_PER_MIN : AUDIO_PAYOUT_PER_MIN;
  try {
    const SystemSettings = require('./models/SystemSettings');
    const settings = await SystemSettings.findOne();
    if (settings) {
      payoutPerMin = isVideo ? (settings.videoPayoutRate ?? VIDEO_PAYOUT_PER_MIN) : (settings.audioPayoutRate ?? AUDIO_PAYOUT_PER_MIN);
    }
  } catch (err) {
    console.error('Error loading dynamic payout rates:', err);
  }

  const timer = setInterval(async () => {
    try {
      const activeSession = await Session.findById(realSessionId);
      if (!activeSession || activeSession.status !== 'active') {
        stopCallBillingTimer(realSessionId);
        stopCallBillingTimer(sessionId);
        return;
      }
      const currentCallType = activeSession.callType || 'audio';
      const isVideo = currentCallType === 'video';
      const coinsPerMin = isVideo ? VIDEO_COINS_PER_MIN : AUDIO_COINS_PER_MIN;
      let payoutPerMin = isVideo ? VIDEO_PAYOUT_PER_MIN : AUDIO_PAYOUT_PER_MIN;
      try {
        const SystemSettings = require('./models/SystemSettings');
        const settings = await SystemSettings.findOne();
        if (settings) {
          payoutPerMin = isVideo ? (settings.videoPayoutRate ?? VIDEO_PAYOUT_PER_MIN) : (settings.audioPayoutRate ?? AUDIO_PAYOUT_PER_MIN);
        }
      } catch (err) {
        console.error('Error loading dynamic payout rates:', err);
      }
      await deductCallMinute(realSessionId, activeSession.userId, activeSession.listenerId, coinsPerMin, payoutPerMin, currentCallType);
    } catch (err) {
      console.error(`[CallBilling] Error in billing timer for ${realSessionId}:`, err);
    }
  }, CALL_BILLING_INTERVAL);

  callBillingTimers[sessionId] = timer;
  callBillingTimers[realSessionId] = timer;

  const currentCallType = session.callType || 'audio';
  const initialIsVideo = currentCallType === 'video';
  const initialCoins = initialIsVideo ? VIDEO_COINS_PER_MIN : AUDIO_COINS_PER_MIN;
  await deductCallMinute(realSessionId, session.userId, session.listenerId, initialCoins, payoutPerMin, currentCallType);
}

/**
 * Deduct one minute's worth of coins from the user and credit the listener.
 */
async function deductCallMinute(sessionId, userId, listenerId, coinsPerMin, payoutPerMin, callType) {
  try {
    const user = await User.findById(userId);
    if (!user) {
      stopCallBillingTimer(sessionId);
      return;
    }

    // Check if user can afford this minute
    if (user.coins < coinsPerMin) {
      // User ran out — end the call
      console.log(`[CallBilling] User ${userId} out of coins, auto-ending session ${sessionId}`);
      stopCallBillingTimer(sessionId);

      // End the session (without re-deducting — we track incrementally)
      await Session.findByIdAndUpdate(sessionId, {
        status: 'completed',
        endTime: new Date(),
      });

      // Increment listener call counters
      await CallService.incrementListenerCounters(listenerId, callType);

      // Auto-ending used to leave the listener marked busy and its Redis lock
      // alive. Release every availability marker before notifying clients.
      const listenerIdStr = listenerId.toString();
      await Listener.findOneAndUpdate(
        { userId: listenerIdStr },
        { isBusy: false, busySince: null }
      );
      await redis.sadd(REDIS_KEYS.LISTENERS_AVAILABLE, listenerIdStr);
      await redis.del(REDIS_KEYS.LOCK(listenerIdStr));
      try {
        io.emit('listener_status_changed', {
          userId: listenerIdStr,
          isOnline: true,
          isBusy: false,
          busySince: null,
        });
        const sseService = require('./services/sseService');
        sseService.broadcastListenerStatus(listenerIdStr, true, false, null);
      } catch (statusErr) {
        console.error('[CallBilling] Failed to broadcast listener availability:', statusErr.message);
      }

      // Notify both parties
      if (io) {
        io.to(`user_${userId}`).emit('call_auto_ended', {
          sessionId,
          reason: 'insufficient_balance',
          message: 'Your balance ran out. The call has ended.',
        });
        io.to(`user_${listenerId}`).emit('call_auto_ended', {
          sessionId,
          reason: 'user_balance_depleted',
          message: 'The call has ended because the user ran out of balance.',
        });
      }
      PushService.sendPushNotification(userId, {
        title: 'Call ended — recharge to continue',
        body: 'Your call ended because your coin balance ran out. Recharge to keep talking.',
        data: { type: 'insufficient_balance', reason: 'call_ended', sessionId: sessionId.toString(), callType },
      }).catch(err => console.error('[CallBilling] Insufficient-balance push failed for user:', err.message));
      PushService.sendPushNotification(listenerId, {
        title: 'Call ended — user ran out of balance',
        body: 'The call has ended because the user ran out of coins. You are now available for new calls.',
        data: { type: 'call_ended', reason: 'user_balance_depleted', sessionId: sessionId.toString() },
      }).catch(err => console.error('[CallBilling] Insufficient-balance push failed for listener:', err.message));
      return;
    }

    // Deduct coins
    user.coins -= coinsPerMin;
    await user.save();

    // Update session tracking
    const session = await Session.findById(sessionId);
    if (session) {
      const isVideo = callType === 'video';
      if (isVideo) {
        session.videoDuration = (session.videoDuration || 0) + 1;
        session.videoCoinsDeducted = (session.videoCoinsDeducted || 0) + coinsPerMin;
        session.videoListenerEarnings = (session.videoListenerEarnings || 0) + payoutPerMin;
      } else {
        session.audioDuration = (session.audioDuration || 0) + 1;
        session.audioCoinsDeducted = (session.audioCoinsDeducted || 0) + coinsPerMin;
        session.audioListenerEarnings = (session.audioListenerEarnings || 0) + payoutPerMin;
      }

      session.coinsDeducted = (session.audioCoinsDeducted || 0) + (session.videoCoinsDeducted || 0);
      session.duration = (session.audioDuration || 0) + (session.videoDuration || 0);
      session.listenerEarnings = (session.audioListenerEarnings || 0) + (session.videoListenerEarnings || 0);
      session.lastDeductionTime = new Date();

      // Calculate financial fields
      const zegoRate = isVideo ? 0.20 : 0.06;
      const infraRate = isVideo ? 0.15 : 0.09;
      session.zegoCost = (session.zegoCost || 0) + zegoRate;
      session.infraCost = (session.infraCost || 0) + infraRate;

      const audioRev = (session.audioCoinsDeducted || 0) * 0.5; // 1 coin = ₹0.50
      const videoRev = (session.videoCoinsDeducted || 0) * 0.5;
      const totalRev = audioRev + videoRev;
      session.platformProfit = totalRev - (session.listenerEarnings + session.zegoCost + session.infraCost);

      await session.save();
    }

    // Record user debit transaction
    await Transaction.create({
      userId,
      type: 'call_debit',
      amount: 0,
      coins: -coinsPerMin,
      description: `${callType} call - per minute charge`,
      status: 'completed',
      metadata: { sessionId },
    });

    // Credit listener
    const listenerProfile = await Listener.findOne({ userId: listenerId });
    if (listenerProfile) {
      listenerProfile.earnings += payoutPerMin;
      listenerProfile.todayEarnings += payoutPerMin;
      await listenerProfile.save();

      await Transaction.create({
        userId: listenerId,
        type: 'call_credit',
        amount: payoutPerMin,
        coins: 0,
        description: `${callType} call earnings - per minute`,
        status: 'completed',
        metadata: { sessionId },
      });
    }

    // Emit balance update to user
    if (io) {
      io.to(`user_${userId}`).emit('balance_updated', {
        coins: user.coins,
        deducted: coinsPerMin,
        reason: 'call_minute_charge',
        sessionId,
      });

      // Low balance warning (enough for less than 1 more minute after next deduction)
      const remainingMinutes = Math.floor(user.coins / coinsPerMin);
      if (remainingMinutes <= 2) {
        io.to(`user_${userId}`).emit('low_balance_warning', {
          coins: user.coins,
          coinsPerMin,
          remainingMinutes,
          sessionId,
          message: remainingMinutes <= 0
            ? 'This is your last minute! Recharge now to continue.'
            : `Only ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''} left. Recharge to keep talking!`,
        });
      }
    }

    console.log(`[CallBilling] Deducted ${coinsPerMin} coins from user ${userId}. Balance: ${user.coins}`);
  } catch (err) {
    console.error(`[CallBilling] deductCallMinute error for session ${sessionId}:`, err);
  }
}

/**
 * Stop the billing timer for a session.
 */
function stopCallBillingTimer(sessionId) {
  const timer = callBillingTimers[sessionId];
  if (timer) {
    clearInterval(timer);
    // Find and delete all keys associated with this timer (both temp ID and real ID)
    Object.keys(callBillingTimers).forEach(key => {
      if (callBillingTimers[key] === timer) {
        delete callBillingTimers[key];
      }
    });
    console.log(`[CallBilling] Stopped billing timer for session ${sessionId}`);
  }
}

/**
 * Periodically checks active chat sessions to see if any participant (user or listener)
 * has been offline continuously for 5+ minutes, and auto-ends the session if so.
 */
function startOfflineChatSessionChecker() {
  setInterval(async () => {
    try {
      if (!io) return;
      const activeConversations = await Conversation.find({ 'chatSession.active': true });
      if (!activeConversations || activeConversations.length === 0) return;

      const now = Date.now();
      for (const conv of activeConversations) {
        if (!conv.chatSession || !conv.chatSession.active) continue;
        const convIdStr = conv._id.toString();

        let shouldEnd = false;
        let offlineUserId = null;

        for (const participantId of conv.participants) {
          const pIdStr = participantId.toString();
          const userSockets = io.sockets.adapter.rooms.get(`user_${pIdStr}`);
          const isOnline = userSockets && userSockets.size > 0;

          if (isOnline) {
            delete userOfflineSince[pIdStr];
          } else {
            if (!userOfflineSince[pIdStr]) {
              userOfflineSince[pIdStr] = now;
            } else if (now - userOfflineSince[pIdStr] >= OFFLINE_CHAT_AUTO_END_MS) {
              shouldEnd = true;
              offlineUserId = pIdStr;
              break;
            }
          }
        }

        if (shouldEnd) {
          console.log(`[Socket] Auto-ending active chat session for conv ${convIdStr} — participant ${offlineUserId} offline for 5+ minutes.`);
          await endChatSession(convIdStr);

          const systemMsg = new Message({
            conversationId: conv._id,
            sender: null,
            senderModel: 'System',
            content: 'Session ended — participant offline for 5+ minutes.',
            type: 'system',
          });
          await systemMsg.save();
          await Conversation.findByIdAndUpdate(conv._id, { lastMessage: systemMsg._id });

          if (io) {
            io.to(convIdStr).emit('receive_message', systemMsg);
          }
        }
      }
    } catch (err) {
      console.error('[Socket] Error in offline chat session checker:', err.message);
    }
  }, 15000);
}

const getIo = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

module.exports = { initSocket, getIo, stopCallBillingTimer };

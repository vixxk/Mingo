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

let io;

// Chat billing constants
const CHAT_COINS_PER_SESSION = 5;    // 5 coins per 5-minute chat session
const CHAT_SESSION_DURATION = 5 * 60 * 1000; // 5 minutes in ms
const CHAT_LISTENER_PAYOUT = 2.50;   // Listener gets ₹2.50 per 5-minute block

// Active chat session timers: { conversationId: timerRef }
const chatSessionTimers = {};
const chatSessionOfflineCheckers = {};

// ─── Call Billing ────────────────────────────────────────────
// Rates per minute
const AUDIO_COINS_PER_MIN = 5;  // 5 coins/min
const VIDEO_COINS_PER_MIN = 15;  // 15 coins/min
const AUDIO_PAYOUT_PER_MIN = 1.50; // ₹1.50/min listener payout
const VIDEO_PAYOUT_PER_MIN = 4.00; // ₹4.00/min listener payout
const CALL_BILLING_INTERVAL = 60 * 1000; // 1 minute
const LOW_BALANCE_THRESHOLD = 10; // Warn when below this many coins remaining

// Active call billing timers: { sessionId: intervalRef }
const callBillingTimers = {};

// Random Call Matching Pools
const randomUsers = new Set();
const randomListeners = new Set();
const randomSearchTimeouts = {};

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
      allowedHeaders: '*'
    }
  });

  io.on('connection', (socket) => {
    console.log('User connected to socket:', socket.id);

    // Try to authenticate immediately from handshake auth token or query token
    const handshakeToken = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (handshakeToken) {
      try {
        const decoded = jwt.verify(handshakeToken, config.jwt.secret);
        socket.userId = decoded.userId;
        socket.join(`user_${decoded.userId}`);
        console.log(`Socket ${socket.id} automatically authenticated from handshake as ${decoded.userId}`);
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
      } catch (err) {
        console.error('Socket auth error:', err.message);
      }
    });

    socket.on('join_conversation', (conversationId) => {
      socket.join(conversationId);
      console.log(`Socket ${socket.id} joined conversation ${conversationId}`);
    });

    socket.on('send_message', async (data) => {
      console.log('[Socket] send_message event received:', JSON.stringify(data));
      const { conversationId, senderId, senderModel, content, type, mediaUrl } = data;
      
      try {
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
          socket.emit('message_error', { error: 'Conversation not found' });
          return;
        }

        const sender = await User.findById(senderId);
        if (!sender) {
          socket.emit('message_error', { error: 'User not found' });
          return;
        }

        // Determine if the sender is the USER (not the listener)
        const isUserRole = sender.role === 'USER';

        // --- FREE FIRST MESSAGE LOGIC ---
        // Check if this user has used their free message in this conversation
        const freeUsed = conversation.freeMessageUsed
          ? conversation.freeMessageUsed.get(senderId)
          : false;

        if (isUserRole && !freeUsed) {
          // This is the user's free first message — allow it
          if (!conversation.freeMessageUsed) {
            conversation.freeMessageUsed = new Map();
          }
          conversation.freeMessageUsed.set(senderId, true);
          await conversation.save();

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
          if (recipientId) {
            await Conversation.findByIdAndUpdate(conversationId, { 
              lastMessage: message._id,
              $inc: { [`unreadCount.${recipientId}`]: 1 }
            });
            try {
              const sseService = require('./services/sseService');
              sseService.notifyUser(recipientId);
            } catch (sseErr) {
              console.error('SSE notify error in FREE send_message:', sseErr);
            }
          } else {
            await Conversation.findByIdAndUpdate(conversationId, { lastMessage: message._id });
          }

          console.log(`[Socket] Emitting receive_message (free) to room ${conversationId}`);
          io.to(conversationId).emit('receive_message', message);

          // Emit notification to recipient's personal room (for badge/notification ONLY, not message)
          if (recipientId) {
            // Check if recipient is in the conversation room already
            const recipientRoom = io.sockets.adapter.rooms.get(conversationId);
            const recipientPersonalSockets = io.sockets.adapter.rooms.get(`user_${recipientId}`);
            const isInConvRoom = recipientRoom && recipientPersonalSockets && 
              [...recipientPersonalSockets].some(sid => recipientRoom.has(sid));

            // Only send message to personal room if they're NOT in the conversation room
            if (!isInConvRoom) {
              io.to(`user_${recipientId}`).emit('receive_message', message);
            }

            // Send push notification
            PushService.sendPushNotification(recipientId, {
              title: sender.name || 'Mingo',
              body: type === 'text' ? content : `Sent a ${type}`,
              data: { url: `/(chat)/chat?conversationId=${conversationId}` },
            });
          }
          return;
        }

        // --- BALANCE CHECK (after free message used) ---
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
              return;
            }
            // User has balance but session not started yet — save message, 
            // session will start when listener replies (handled in listener's reply flow below)
          }
        }

        // --- BLOCK LISTENER REPLY AFTER SESSION ENDS ---
        // If the listener is replying but the session has been explicitly ended
        // (session exists but not active), don't allow messages
        const isListenerSender = sender.role === 'LISTENER';
        if (isListenerSender) {
          const sessionData = conversation.chatSession;
          // Session was previously active but has been ended
          if (sessionData && sessionData.startTime && !sessionData.active) {
            // Check if user also has no balance (prevent session restart)
            const userParticipantId = conversation.participants.find(
              (p) => p.toString() !== senderId
            );
            const userParticipant = userParticipantId ? await User.findById(userParticipantId) : null;
            
            if (!userParticipant || userParticipant.coins < CHAT_COINS_PER_SESSION) {
              // Session ended and user can't afford restart — block listener
              socket.emit('message_error', {
                error: 'Session has ended. Waiting for user to recharge and send a new message.',
                type: 'session_ended',
              });
              return;
            }
          }
        }

        // Save and send the message
        console.log(`[Socket] Saving message in conv ${conversationId} from ${senderId} (${senderModel})`);
        const message = new Message({
          conversationId,
          sender: senderId,
          senderModel: senderModel || (isUserRole ? 'User' : 'Listener'),
          content,
          type: type || 'text',
          mediaUrl
        });
        await message.save();

        const recipientId = conversation.participants.find(p => p.toString() !== senderId.toString());
        if (recipientId) {
          await Conversation.findByIdAndUpdate(conversationId, { 
            lastMessage: message._id,
            $inc: { [`unreadCount.${recipientId}`]: 1 }
          });
          try {
            const sseService = require('./services/sseService');
            sseService.notifyUser(recipientId);
          } catch (sseErr) {
            console.error('SSE notify error in send_message:', sseErr);
          }
        } else {
          await Conversation.findByIdAndUpdate(conversationId, { lastMessage: message._id });
        }
        
        // Emit to the conversation room (for people already in the chat)
        console.log(`[Socket] Emitting receive_message to room ${conversationId}`);
        io.to(conversationId).emit('receive_message', message);

        // Emit to recipient's personal room only if they're NOT in the conversation room
        if (recipientId) {
          const recipientRoom = io.sockets.adapter.rooms.get(conversationId);
          const recipientPersonalSockets = io.sockets.adapter.rooms.get(`user_${recipientId}`);
          const isInConvRoom = recipientRoom && recipientPersonalSockets && 
            [...recipientPersonalSockets].some(sid => recipientRoom.has(sid));

          if (!isInConvRoom) {
            io.to(`user_${recipientId}`).emit('receive_message', message);
          }

          // Send push notification
          PushService.sendPushNotification(recipientId, {
            title: sender.name || 'Mingo',
            body: type === 'text' ? content : `Sent a ${type}`,
            data: { url: `/(chat)/chat?conversationId=${conversationId}` },
          });
        }

        // --- TIMED SESSION START ---
        // If this message is from the LISTENER (reply to user), start the timed session
        const isListenerRole = sender.role === 'LISTENER';
        if (isListenerRole) {
          const sessionData = conversation.chatSession;
          const needsNewSession = !sessionData || !sessionData.active;
          
          if (needsNewSession) {
            // Find the user participant to deduct from
            const userParticipantId = conversation.participants.find(
              (p) => p.toString() !== senderId
            );

            if (userParticipantId) {
              const userParticipant = await User.findById(userParticipantId);
              
              if (userParticipant && userParticipant.coins >= CHAT_COINS_PER_SESSION) {
                // Deduct coins for the first 5-minute block
                userParticipant.coins -= CHAT_COINS_PER_SESSION;
                await userParticipant.save();

                // Record transaction
                await Transaction.create({
                  userId: userParticipantId,
                  type: 'call_debit',
                  amount: 0,
                  coins: -CHAT_COINS_PER_SESSION,
                  description: 'Chat session - 5 min block',
                  status: 'completed',
                  metadata: {},
                });

                // Mark session active
                conversation.chatSession = {
                  active: true,
                  startedBy: userParticipantId,
                  startTime: new Date(),
                  lastDeductionTime: new Date(),
                  totalCoinsDeducted: CHAT_COINS_PER_SESSION,
                };
                await conversation.save();

                // Credit listener (the sender of this reply)
                const listenerProfile = await Listener.findOne({ userId: senderId });
                if (listenerProfile) {
                  listenerProfile.earnings += CHAT_LISTENER_PAYOUT;
                  listenerProfile.todayEarnings += CHAT_LISTENER_PAYOUT;
                  await listenerProfile.save();

                  // Record transaction for listener
                  await Transaction.create({
                    userId: senderId,
                    type: 'call_credit',
                    amount: CHAT_LISTENER_PAYOUT,
                    coins: 0,
                    description: 'Chat session earnings - 5 min block',
                    status: 'completed',
                    metadata: { conversationId },
                  });
                }

                 // Notify user of balance update
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
            }
          }
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

    socket.on('call_incoming', (data) => {
      const { listenerId, callData } = data;
      io.to(`user_${listenerId}`).emit('incoming_call', callData);
    });

    socket.on('call_accepted', (data) => {
      const { userId, sessionId, roomId } = data;
      io.to(`user_${userId}`).emit('call_accepted', { sessionId, roomId });
    });

    socket.on('call_rejected', async (data) => {
      const { userId, sessionId, reason } = data;
      console.log(`[Socket] call_rejected received from listener. Caller user: ${userId}, Session: ${sessionId}`);
      io.to(`user_${userId}`).emit('call_rejected', { reason: reason || 'rejected' });
      try {
        if (sessionId) {
          await Session.findByIdAndUpdate(sessionId, { status: 'cancelled' });
        }
        let listenerUserId = socket.userId;
        if (!listenerUserId && sessionId) {
          const sess = await Session.findById(sessionId);
          if (sess) listenerUserId = sess.listenerId;
        }
        if (listenerUserId) {
          await Listener.findOneAndUpdate({ userId: listenerUserId }, { isBusy: false });
          io.emit('listener_status_changed', { userId: listenerUserId, isOnline: true, isBusy: false });
          await redis.sadd(REDIS_KEYS.LISTENERS_AVAILABLE, listenerUserId.toString());
          await redis.del(REDIS_KEYS.LOCK(listenerUserId.toString()));
        }
      } catch (err) {
        console.error('[Socket] Error handling call_rejected DB updates:', err.message);
      }
    });

    socket.on('call_cancelled', async (data) => {
      const { userId, sessionId } = data;
      console.log(`[Socket] call_cancelled received from caller. Listener: ${userId}, Session: ${sessionId}`);
      if (userId) {
        io.to(`user_${userId}`).emit('call_cancelled', { sessionId });
      }
      try {
        if (sessionId) {
          await Session.findByIdAndUpdate(sessionId, { status: 'cancelled' });
        }
        if (userId) {
          await Listener.findOneAndUpdate({ userId: userId }, { isBusy: false });
          io.emit('listener_status_changed', { userId: userId, isOnline: true, isBusy: false });
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
            
            // Notify both user rooms
            io.to(`user_${session.userId}`).emit('call_ended', { sessionId });
            io.to(`user_${session.listenerId}`).emit('call_ended', { sessionId });
            
            // Reset listener busy status
            await Listener.findOneAndUpdate({ userId: session.listenerId }, { isBusy: false });
            io.emit('listener_status_changed', { userId: session.listenerId.toString(), isOnline: true, isBusy: false });
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
          return;
        }

        // Match with a listener
        if (randomListeners.size > 0) {
          const matchedListenerId = [...randomListeners][0];
          randomListeners.delete(matchedListenerId);
          if (randomSearchTimeouts[matchedListenerId]) {
            clearTimeout(randomSearchTimeouts[matchedListenerId]);
            delete randomSearchTimeouts[matchedListenerId];
          }

          const listener = await Listener.findOne({ userId: matchedListenerId });
          const listenerUser = await User.findById(matchedListenerId);

          socket.emit('random_match_found', {
            partnerId: matchedListenerId,
            partnerName: listenerUser?.name || 'Listener',
            partnerAvatar: listener?.avatarIndex || '0',
            partnerGender: listener?.gender || 'Female',
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
          randomUsers.add(userId);
          socket.emit('searching_random', { message: 'Searching for an online listener...' });
          
          // Auto-timeout after 60 seconds
          randomSearchTimeouts[userId] = setTimeout(() => {
            randomUsers.delete(userId);
            socket.emit('random_search_timeout');
            delete randomSearchTimeouts[userId];
          }, 60000);
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
        randomUsers.delete(socket.userId);
        randomListeners.delete(socket.userId);
        if (randomSearchTimeouts[socket.userId]) {
          clearTimeout(randomSearchTimeouts[socket.userId]);
          delete randomSearchTimeouts[socket.userId];
        }
        
        // Auto-offline listener, end active call/chat sessions on disconnect (app closing)
        const disconnectedUserId = socket.userId;
        (async () => {
          try {
            // 1. Auto-offline listener
            const listener = await Listener.findOne({ userId: disconnectedUserId });
            if (listener) {
              const PresenceService = require('./services/presenceService');
              await PresenceService.goOffline(disconnectedUserId);
              console.log(`Listener ${disconnectedUserId} automatically set to offline on socket disconnect.`);
            }

            // 2. Auto-end active calls (immediately)
            const activeCall = await Session.findOne({
              $or: [{ userId: disconnectedUserId }, { listenerId: disconnectedUserId }],
              status: 'active'
            });
            if (activeCall) {
              console.log(`[Socket] Auto-ending active call ${activeCall._id} on participant disconnect: ${disconnectedUserId}`);
              activeCall.status = 'completed';
              activeCall.endTime = new Date();
              await activeCall.save();
              stopCallBillingTimer(activeCall._id.toString());
              stopCallBillingTimer(activeCall.roomId);

              // Notify both participants
              io.to(`user_${activeCall.userId}`).emit('call_ended', { sessionId: activeCall._id.toString() });
              io.to(`user_${activeCall.listenerId}`).emit('call_ended', { sessionId: activeCall._id.toString() });
              
              // Reset listener busy status and release lock
              const listenerIdStr = activeCall.listenerId.toString();
              await Listener.findOneAndUpdate({ userId: listenerIdStr }, { isBusy: false });
              io.emit('listener_status_changed', { userId: listenerIdStr, isOnline: false, isBusy: false });
              await redis.sadd(REDIS_KEYS.LISTENERS_AVAILABLE, listenerIdStr);
              await redis.del(REDIS_KEYS.LOCK(listenerIdStr));
            }

            // 3. Auto-end active chat sessions after 1 minute grace period
            const activeChatConvs = await Conversation.find({
              participants: disconnectedUserId,
              'chatSession.active': true
            });
            if (activeChatConvs.length > 0) {
              console.log(`[Socket] User ${disconnectedUserId} disconnected with ${activeChatConvs.length} active chat(s). Starting 60s grace period...`);
              
              // Notify the other participant that user went offline
              for (const conv of activeChatConvs) {
                const otherParticipant = conv.participants.find(p => p.toString() !== disconnectedUserId.toString());
                if (otherParticipant) {
                  io.to(`user_${otherParticipant}`).emit('chat_user_offline', {
                    conversationId: conv._id.toString(),
                    userId: disconnectedUserId,
                    message: 'User went offline. Session will end in 1 minute if they don\'t reconnect.',
                  });
                }
              }

              // Wait 60 seconds, then check if user reconnected
              setTimeout(async () => {
                try {
                  // Check if user has reconnected (any socket in their personal room)
                  const userRoom = io.sockets.adapter.rooms.get(`user_${disconnectedUserId}`);
                  const isReconnected = userRoom && userRoom.size > 0;
                  
                  if (!isReconnected) {
                    // User did NOT reconnect — end all their active chat sessions
                    for (const conv of activeChatConvs) {
                      const freshConv = await Conversation.findById(conv._id);
                      if (freshConv && freshConv.chatSession && freshConv.chatSession.active) {
                        console.log(`[Socket] Auto-ending chat session for conv ${conv._id} — user ${disconnectedUserId} offline for >1 min.`);
                        await endChatSession(conv._id.toString());
                        
                        // Send system message
                        const systemMsg = new Message({
                          conversationId: conv._id,
                          sender: null,
                          senderModel: 'System',
                          content: 'Session ended — user went offline.',
                          type: 'system',
                        });
                        await systemMsg.save();
                        await Conversation.findByIdAndUpdate(conv._id, { lastMessage: systemMsg._id });
                        io.to(conv._id.toString()).emit('receive_message', systemMsg);
                      }
                    }
                  } else {
                    console.log(`[Socket] User ${disconnectedUserId} reconnected within 60s — chat session(s) preserved.`);
                  }
                } catch (e) {
                  console.error('Error in chat disconnect grace period:', e.message);
                }
              }, 60000); // 60 second grace period
            }
          } catch (e) {
            console.error('Error on disconnect cleanup:', e.message);
          }
        })();
      }
    });
  });
};

/**
 * Start a recurring timer that deducts coins every 5 minutes for an active chat session.
 */
function startChatSessionTimer(conversationId, userId) {
  // Clear any existing timer for this conversation
  if (chatSessionTimers[conversationId]) {
    clearInterval(chatSessionTimers[conversationId]);
  }
  if (chatSessionOfflineCheckers[conversationId]) {
    clearInterval(chatSessionOfflineCheckers[conversationId]);
  }

  // Check user offline every 60 seconds
  chatSessionOfflineCheckers[conversationId] = setInterval(() => {
    if (!io) return;
    const userSockets = io.sockets.adapter.rooms.get(`user_${userId}`);
    if (!userSockets || userSockets.size === 0) {
      console.log(`[Socket] User ${userId} is offline. Auto-ending chat session ${conversationId}.`);
      endChatSession(conversationId);
      
      Conversation.findById(conversationId).then(conversation => {
        if (conversation) {
          const listenerId = conversation.participants.find(p => p.toString() !== userId.toString());
          if (listenerId) {
             io.to(`user_${listenerId}`).emit('chat_user_offline', { 
               conversationId,
               message: 'User went offline. Chat session ended automatically.'
             });
          }
        }
      }).catch(err => console.error('Error in offline check:', err));
    }
  }, 60000);

  chatSessionTimers[conversationId] = setInterval(async () => {
    try {
      const conversation = await Conversation.findById(conversationId);
      if (!conversation || !conversation.chatSession || !conversation.chatSession.active) {
        clearInterval(chatSessionTimers[conversationId]);
        delete chatSessionTimers[conversationId];
        return;
      }

      const user = await User.findById(userId);
      if (!user || user.coins < CHAT_COINS_PER_SESSION) {
        // Insufficient balance — end session and notify
        await endChatSession(conversationId);

        // Send system message
        const systemMsg = new Message({
          conversationId,
          sender: null,
          senderModel: 'System',
          content: 'Please recharge to continue chatting.',
          type: 'system',
        });
        await systemMsg.save();
        await Conversation.findByIdAndUpdate(conversationId, { lastMessage: systemMsg._id });

        if (io) {
          io.to(conversationId).emit('receive_message', systemMsg);
          io.to(`user_${userId}`).emit('insufficient_balance', {
            conversationId,
            requiredCoins: CHAT_COINS_PER_SESSION,
            currentCoins: user ? user.coins : 0,
          });
          io.to(`user_${userId}`).emit('chat_session_ended', { conversationId });
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
        metadata: {},
      });

      conversation.chatSession.lastDeductionTime = new Date();
      conversation.chatSession.totalCoinsDeducted += CHAT_COINS_PER_SESSION;
      await conversation.save();

      // Credit listener
      // We need to find the listener in this conversation
      const listenerId = conversation.participants.find(p => p.toString() !== userId.toString());
      if (listenerId) {
        const listenerProfile = await Listener.findOne({ userId: listenerId });
        if (listenerProfile) {
          listenerProfile.earnings += CHAT_LISTENER_PAYOUT;
          listenerProfile.todayEarnings += CHAT_LISTENER_PAYOUT;
          await listenerProfile.save();

          // Record transaction for listener
          await Transaction.create({
            userId: listenerId,
            type: 'call_credit',
            amount: CHAT_LISTENER_PAYOUT,
            coins: 0,
            description: 'Chat session renewal earnings - 5 min block',
            status: 'completed',
            metadata: { conversationId },
          });
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

    const conversation = await Conversation.findByIdAndUpdate(
      conversationId,
      { 'chatSession.active': false },
      { new: true }
    );

    if (conversation && io) {
      io.to(conversationId).emit('chat_session_ended', { conversationId });
      conversation.participants.forEach(p => {
        io.to(`user_${p}`).emit('chat_session_ended', { conversationId });
      });
    }
  } catch (error) {
    console.error('Error ending chat session:', error);
  }
}

// ─── Call Billing Timer Functions ──────────────────────────────
const mongoose = require('mongoose');

/**
 * Start per-minute billing for an active call session.
 * Deducts coins every 60 seconds, emits balance updates,
 * warns on low balance, and auto-ends when balance is 0.
 */
async function startCallBillingTimer(sessionId) {
  // Don't double-start
  if (callBillingTimers[sessionId]) return;

  let session;
  if (mongoose.Types.ObjectId.isValid(sessionId)) {
    session = await Session.findById(sessionId);
  } else {
    // Fallback: try finding by roomId if frontend passed roomId instead of session._id
    session = await Session.findOne({ roomId: sessionId });
  }

  if (!session || session.status !== 'active') return;

  const realSessionId = session._id.toString();
  // If we found it by roomId, check if a timer already exists for the real ID
  if (callBillingTimers[realSessionId]) return;

  const isVideo = session.callType === 'video';
  const coinsPerMin = isVideo ? VIDEO_COINS_PER_MIN : AUDIO_COINS_PER_MIN;
  const payoutPerMin = isVideo ? VIDEO_PAYOUT_PER_MIN : AUDIO_PAYOUT_PER_MIN;

  // Mark the first deduction time
  session.lastDeductionTime = new Date();
  await session.save();

  // Store timer under both the passed ID and the real ID for cleanup reliability
  const timer = setInterval(async () => {
    try {
      const activeSession = await Session.findById(realSessionId);
      if (!activeSession || activeSession.status !== 'active') {
        stopCallBillingTimer(realSessionId);
        stopCallBillingTimer(sessionId);
        return;
      }

      await deductCallMinute(realSessionId, activeSession.userId, activeSession.listenerId, coinsPerMin, payoutPerMin, activeSession.callType);
    } catch (err) {
      console.error(`[CallBilling] Error in billing timer for ${realSessionId}:`, err);
    }
  }, CALL_BILLING_INTERVAL);

  callBillingTimers[sessionId] = timer;
  callBillingTimers[realSessionId] = timer;

  // Deduct the first minute immediately (call just started)
  await deductCallMinute(realSessionId, session.userId, session.listenerId, coinsPerMin, payoutPerMin, session.callType);
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
      return;
    }

    // Deduct coins
    user.coins -= coinsPerMin;
    await user.save();

    // Update session tracking
    const session = await Session.findById(sessionId);
    if (session) {
      session.coinsDeducted = (session.coinsDeducted || 0) + coinsPerMin;
      session.duration = (session.duration || 0) + 1;
      session.lastDeductionTime = new Date();

      // Calculate financial fields
      const isVideo = callType === 'video';
      const zegoRate = isVideo ? 0.20 : 0.06;
      const infraRate = isVideo ? 0.15 : 0.09;
      const sellingPrice = isVideo ? 15.00 : 5.00;
      session.listenerEarnings = (session.listenerEarnings || 0) + payoutPerMin;
      session.zegoCost = (session.zegoCost || 0) + zegoRate;
      session.infraCost = (session.infraCost || 0) + infraRate;
      session.platformProfit = (session.duration * sellingPrice) - (session.listenerEarnings + session.zegoCost + session.infraCost);

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

const getIo = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

module.exports = { initSocket, getIo, stopCallBillingTimer };

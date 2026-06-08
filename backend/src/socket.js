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
const CHAT_COINS_PER_SESSION = 10;    // 10 coins per 5-minute chat session (10 Coins / 5 mins)
const CHAT_SESSION_DURATION = 5 * 60 * 1000; // 5 minutes in ms
const CHAT_LISTENER_PAYOUT = 2.50;   // Listener gets ₹2.50 per 5-minute block (Rs. 0.50/min)

// Active chat session timers: { conversationId: timerRef }
const chatSessionTimers = {};
const chatSessionOfflineCheckers = {};

// ─── Call Billing ────────────────────────────────────────────
// Rates per minute
const AUDIO_COINS_PER_MIN = 10;  // 10 coins/min (from user screenshot)
const VIDEO_COINS_PER_MIN = 40;  // 40 coins/min (from user screenshot)
const AUDIO_PAYOUT_PER_MIN = 1.00; // ₹1.00/min listener payout
const VIDEO_PAYOUT_PER_MIN = 4.00; // ₹4.00/min listener payout (from listener screenshot)
const CALL_BILLING_INTERVAL = 60 * 1000; // 1 minute
const LOW_BALANCE_THRESHOLD = 10; // Warn when below this many coins remaining

// Active call billing timers: { sessionId: intervalRef }
const callBillingTimers = {};

// Active background offline timers for backgrounded users
const backgroundOfflineTimers = {};

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
        if (backgroundOfflineTimers[userIdStr]) {
          clearTimeout(backgroundOfflineTimers[userIdStr]);
          delete backgroundOfflineTimers[userIdStr];
          console.log(`Cancelled background offline timer for ${userIdStr} on handshake auth`);
        }
        if (!socket.appOpened) {
          socket.appOpened = true;
          User.findByIdAndUpdate(decoded.userId, { $inc: { appOpens: 1 } }).catch(err => console.error('handshake appOpen inc error:', err));
        }
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
        if (backgroundOfflineTimers[userIdStr]) {
          clearTimeout(backgroundOfflineTimers[userIdStr]);
          delete backgroundOfflineTimers[userIdStr];
          console.log(`Cancelled background offline timer for ${userIdStr} on authenticate event`);
        }
        if (!socket.appOpened) {
          socket.appOpened = true;
          User.findByIdAndUpdate(decoded.userId, { $inc: { appOpens: 1 } }).catch(err => console.error('authenticate appOpen inc error:', err));
        }
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

    socket.on('leave_conversation', (conversationId) => {
      socket.leave(conversationId);
      console.log(`Socket ${socket.id} left conversation ${conversationId}`);
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
          const recipientIdStr = recipientId ? recipientId.toString() : null;
          
          // Check if recipient is in the conversation room
          let isRecipientInConvRoom = false;
          if (recipientIdStr) {
            const recipientRoom = io.sockets.adapter.rooms.get(conversationId);
            const recipientPersonalSockets = io.sockets.adapter.rooms.get(`user_${recipientIdStr}`);
            isRecipientInConvRoom = recipientRoom && recipientPersonalSockets && 
              [...recipientPersonalSockets].some(sid => recipientRoom.has(sid));
          }

          if (recipientIdStr) {
            if (isRecipientInConvRoom) {
              await Conversation.findByIdAndUpdate(conversationId, { 
                lastMessage: message._id,
                [`unreadCount.${recipientIdStr}`]: 0
              });
            } else {
              await Conversation.findByIdAndUpdate(conversationId, { 
                lastMessage: message._id,
                $inc: { [`unreadCount.${recipientIdStr}`]: 1 }
              });
            }
            try {
              const sseService = require('./services/sseService');
              sseService.notifyUser(recipientIdStr);
            } catch (sseErr) {
              console.error('SSE notify error in FREE send_message:', sseErr);
            }
          } else {
            await Conversation.findByIdAndUpdate(conversationId, { lastMessage: message._id });
          }

          console.log(`[Socket] Emitting receive_message (free) to room ${conversationId}`);
          io.to(conversationId).emit('receive_message', message);

          // Emit notification to recipient's personal room (for badge/notification ONLY, not message)
          if (recipientIdStr && !isRecipientInConvRoom) {
            io.to(`user_${recipientIdStr}`).emit('receive_message', message);
            
            // Send push notification
            PushService.sendPushNotification(recipientIdStr, {
              title: sender.name || 'Mingo',
              body: type === 'text' ? content : `Sent a ${type}`,
              data: { 
                url: `/chat?id=${conversationId}`,
                conversationId: conversationId.toString(),
                type: 'chat_message',
              },
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
        // If the listener is replying but the session is not active, block the message
        // unless the user has sent a new message to restart/initiate.
        const isListenerSender = sender.role === 'LISTENER';
        if (isListenerSender) {
          const sessionData = conversation.chatSession;
          if (sessionData && !sessionData.active) {
            // Find the last message in the conversation
            const lastMsg = conversation.lastMessage ? await Message.findById(conversation.lastMessage) : null;
            
            // If the last message is not from the User, block the listener from sending messages
            if (!lastMsg || lastMsg.senderModel !== 'User') {
              socket.emit('message_error', {
                error: 'Session has ended. Waiting for user to send a new message.',
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

        if (recipientIdStr) {
          if (isRecipientInConvRoom) {
            // Recipient is already in the chat — just update lastMessage, don't increment unread
            await Conversation.findByIdAndUpdate(conversationId, { 
              lastMessage: message._id,
              [`unreadCount.${recipientIdStr}`]: 0
            });
          } else {
            // Recipient is NOT in the chat — increment unread count
            await Conversation.findByIdAndUpdate(conversationId, { 
              lastMessage: message._id,
              $inc: { [`unreadCount.${recipientIdStr}`]: 1 }
            });
          }
          try {
            const sseService = require('./services/sseService');
            sseService.notifyUser(recipientIdStr);
          } catch (sseErr) {
            console.error('SSE notify error in send_message:', sseErr);
          }
        } else {
          await Conversation.findByIdAndUpdate(conversationId, { lastMessage: message._id });
        }
        
        // Emit to the conversation room (for people already in the chat)
        console.log(`[Socket] Emitting receive_message to room ${conversationId}`);
        io.to(conversationId).emit('receive_message', message);

        // Emit to recipient's personal room and push notification only if they're NOT in the conversation room
        if (recipientIdStr && !isRecipientInConvRoom) {
          io.to(`user_${recipientIdStr}`).emit('receive_message', message);
          
          // Send push notification
          PushService.sendPushNotification(recipientIdStr, {
            title: sender.name || 'Mingo',
            body: type === 'text' ? content : `Sent a ${type}`,
            data: { 
              url: `/chat?id=${conversationId}`,
              conversationId: conversationId.toString(),
              type: 'chat_message',
            },
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

                // Mark session active
                const Session = require('./models/sessionModel');
                const { v4: uuidv4 } = require('uuid');
                let chatSessionDoc = null;
                try {
                  chatSessionDoc = await Session.create({
                    userId: userParticipantId,
                    listenerId: senderId,
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
                const listenerProfile = await Listener.findOne({ userId: senderId });
                if (listenerProfile) {
                  listenerProfile.totalChats = (listenerProfile.totalChats || 0) + 1;
                  listenerProfile.todayChats = (listenerProfile.todayChats || 0) + 1;
                  listenerProfile.totalSessions = (listenerProfile.totalSessions || 0) + 1;
                  await listenerProfile.save();
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
      let { userId, sessionId } = data;
      console.log(`[Socket] call_cancelled received from caller. Listener: ${userId}, Session: ${sessionId}`);
      
      try {
        let session = null;
        if (sessionId) {
          session = await Session.findByIdAndUpdate(sessionId, { status: 'cancelled' }, { new: true });
        }
        
        // Extract listener's user ID from the active session if missing from data
        if (!userId && session) {
          userId = session.listenerId?.toString();
        }

        if (userId) {
          io.to(`user_${userId}`).emit('call_cancelled', { sessionId });
          
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
        
        // Auto-offline listener, end active call/chat sessions on disconnect (app closing)
        const disconnectedUserId = socket.userId;
        (async () => {
          try {
            // 1. Auto-offline listener
            const listener = await Listener.findOne({ userId: disconnectedUserId });
            if (listener) {
              const userIdStr = disconnectedUserId.toString();
              if (socket.isBackgrounded) {
                console.log(`Listener ${userIdStr} disconnected due to backgrounding. Keeping online for 2 minutes.`);
                if (backgroundOfflineTimers[userIdStr]) {
                  clearTimeout(backgroundOfflineTimers[userIdStr]);
                }
                backgroundOfflineTimers[userIdStr] = setTimeout(async () => {
                  try {
                    const PresenceService = require('./services/presenceService');
                    await PresenceService.goOffline(disconnectedUserId);
                    console.log(`Listener ${userIdStr} automatically set to offline after 2 mins background timeout.`);
                    delete backgroundOfflineTimers[userIdStr];
                  } catch (err) {
                    console.error('Error running background offline timeout:', err.message);
                  }
                }, 120000); // 2 minutes
              } else {
                const PresenceService = require('./services/presenceService');
                await PresenceService.goOffline(disconnectedUserId);
                console.log(`Listener ${userIdStr} automatically set to offline on socket disconnect.`);
              }
            }

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

            // 3. Notify other participant that user went offline
            const activeChatConvs = await Conversation.find({
              participants: disconnectedUserId,
              'chatSession.active': true
            });
            if (activeChatConvs.length > 0) {
              console.log(`[Socket] User ${disconnectedUserId} disconnected with ${activeChatConvs.length} active chat(s).`);
              
              // Notify the other participant that user went offline
              for (const conv of activeChatConvs) {
                const otherParticipant = conv.participants.find(p => p.toString() !== disconnectedUserId.toString());
                if (otherParticipant) {
                  io.to(`user_${otherParticipant}`).emit('chat_user_offline', {
                    conversationId: conv._id.toString(),
                    userId: disconnectedUserId,
                    message: 'User went offline.',
                  });
                }
              }
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
        const content = !isUserOnline ? 'Session ended — user went offline.' : 'Please recharge to continue chatting.';
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
          }
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

        await Session.findByIdAndUpdate(conversationBefore.chatSession.sessionId, {
          status: 'completed',
          endTime,
          duration: durationMinutesBilled,
          coinsDeducted: coinsDeductedObj,
          listenerEarnings: payoutAmountBilled,
          platformProfit: platformProfit
        });

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
      io.to(conversationId).emit('chat_session_ended', { conversationId });
      conversation.participants.forEach(p => {
        io.to(`user_${p}`).emit('chat_session_ended', { conversationId });
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
              const content = !isUserOnline ? 'Session ended — user went offline.' : 'Please recharge to continue chatting.';
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

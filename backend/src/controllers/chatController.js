const Conversation = require('../models/conversationModel');
const Message = require('../models/messageModel');
const User = require('../models/userModel');
const ApiResponse = require('../utils/apiResponse');

class ChatController {
  static async getConversations(req, res, next) {
    try {
      const userId = req.user.id;
      const Session = require('../models/sessionModel');
      const Listener = require('../models/listenerModel');

      // Get all chat sessions involving this user
      const chatSessions = await Session.find({
        $or: [{ userId }, { listenerId: userId }],
        callType: 'chat'
      })
      .populate('userId', 'name username avatarIndex gender profileImage')
      .populate('listenerId', 'name username avatarIndex gender profileImage')
      .sort({ startTime: -1 });

      // Get all conversations involving this user
      const conversations = await Conversation.find({
        participants: userId
      })
      .populate('participants', 'name username avatarIndex gender profileImage role')
      .populate('lastMessage')
      .sort({ updatedAt: -1 });

      const cards = [];

      // Build a map of listener online state for the conversation partners so
      // the messages list can show a real online dot (regular users are not
      // presence-tracked). Uses the same persisted flag as the profile/chat.
      const listenerOnlineMap = {};
      try {
        const otherUserIds = [];
        for (const conv of conversations) {
          const otherUser = conv.participants.find(p => p._id.toString() !== userId);
          if (otherUser && (otherUser.role === 'LISTENER' || (otherUser.role || '').endsWith('_LISTENER'))) {
            otherUserIds.push(otherUser._id);
          }
        }
        if (otherUserIds.length) {
          const listenerDocs = await Listener.find({ userId: { $in: otherUserIds } }).select('userId isOnline');
          listenerDocs.forEach(l => { listenerOnlineMap[l.userId.toString()] = !!l.isOnline; });
        }
      } catch (mapErr) {
        console.error('Error building listener online map:', mapErr.message);
      }

      for (const conv of conversations) {
        // Find all sessions for this conversation
        const convSessions = chatSessions.filter(s => {
          const sUserId = s.userId?._id ? s.userId._id.toString() : s.userId?.toString();
          const sListenerId = s.listenerId?._id ? s.listenerId._id.toString() : s.listenerId?.toString();
          const p0Id = conv.participants[0]?._id ? conv.participants[0]._id.toString() : conv.participants[0]?.toString();
          const p1Id = conv.participants[1]?._id ? conv.participants[1]._id.toString() : conv.participants[1]?.toString();
          
          return (sUserId === p0Id && sListenerId === p1Id) || (sUserId === p1Id && sListenerId === p0Id);
        });

        const otherUser = conv.participants.find(p => p._id.toString() !== userId);
        const unreadCount = conv.unreadCount ? (conv.unreadCount.get(userId) || 0) : 0;
        const isSupport = otherUser && (otherUser.role === 'ADMIN' || otherUser.role.endsWith('_ADMIN'));

        if (convSessions.length === 0) {
          // No sessions at all: push a default card
          cards.push({
            id: conv._id,
            otherUserId: otherUser?._id?.toString(),
            sessionId: null,
            name: isSupport ? 'Mingo Support' : (otherUser?.name || otherUser?.username || 'Unknown'),
            gender: otherUser?.gender,
            avatarIndex: otherUser?.avatarIndex,
            image: otherUser?.profileImage,
            lastMessage: conv.lastMessage?.content || 'Say hello!',
            time: conv.lastMessage?.createdAt || conv.updatedAt,
            unread: unreadCount,
            isOnline: !!listenerOnlineMap[otherUser?._id?.toString()],
            sessionStatus: 'none',
            isAdmin: isSupport
          });
          continue;
        }

        // ── One card PER chat session (each session is its own page) ──
        const sortedSessions = [...convSessions].sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
        const latestSession = sortedSessions[0];

        // A "current phase" card (sessionId: null) is added when messages were
        // sent after the last session ended — i.e. the user's free-message
        // phase of a brand-new session that hasn't been paid for yet.
        const conversationLastMessage = conv.lastMessage;
        const hasNewerPhaseMessages =
          latestSession &&
          latestSession.status !== 'active' &&
          latestSession.endTime &&
          conversationLastMessage &&
          new Date(conversationLastMessage.createdAt) > new Date(latestSession.endTime);

        for (const session of sortedSessions) {
          const isLatest = session._id.toString() === latestSession._id.toString();

          // Auto-complete an expired active session (paid blocks used up)
          if (session.status === 'active') {
            const startTime = session.startTime;
            const coinsDeducted = session.coinsDeducted || 10;
            const CHAT_SESSION_DURATION = 5 * 60 * 1000;
            const paidBlocks = Math.ceil(coinsDeducted / 10);
            const paidDuration = paidBlocks * CHAT_SESSION_DURATION;
            const expirationTime = new Date(startTime).getTime() + paidDuration;

            if (Date.now() >= expirationTime) {
              session.status = 'completed';
              session.endTime = new Date(expirationTime);
              await session.save();

              if (isLatest) {
                conv.chatSession = {
                  active: false,
                  startedBy: null,
                  startTime: null,
                  lastDeductionTime: null,
                  sessionId: null,
                  status: 'none'
                };
                await conv.save();
              }
            }
          }

          // Find the last message inside this session's time window
          const query = {
            conversationId: conv._id,
            createdAt: { $gte: session.startTime }
          };
          if (session.endTime) {
            query.createdAt.$lte = session.endTime;
          }

          let lastMsg = await Message.findOne(query).sort({ createdAt: -1 });
          // Only the newest card may fall back to the conversation's last
          // message (which can belong to a newer phase); older cards get a
          // neutral label instead of a wrong preview.
          if (!lastMsg && !isLatest) {
            lastMsg = null;
          } else if (!lastMsg) {
            lastMsg = conv.lastMessage;
          }

          cards.push({
            id: conv._id,
            otherUserId: otherUser?._id?.toString(),
            sessionId: session._id,
            name: isSupport ? 'Mingo Support' : (otherUser?.name || otherUser?.username || 'Unknown'),
            gender: otherUser?.gender,
            avatarIndex: otherUser?.avatarIndex,
            image: otherUser?.profileImage,
            lastMessage: lastMsg?.content || 'Session started',
            time: lastMsg?.createdAt || session.startTime,
            unread: (isLatest && !hasNewerPhaseMessages) ? unreadCount : 0,
            isOnline: !!listenerOnlineMap[otherUser?._id?.toString()],
            sessionStatus: session.status, // 'active' | 'completed' | 'cancelled'
            duration: session.duration,
            startTime: session.startTime,
            endTime: session.endTime,
            listenerEarnings: session.listenerEarnings || 0,
            coinsDeducted: session.coinsDeducted || 0,
            isAdmin: isSupport
          });
        }

        // Current-phase card on top (the fresh, unpaid session window)
        if (hasNewerPhaseMessages) {
          cards.push({
            id: conv._id,
            otherUserId: otherUser?._id?.toString(),
            sessionId: null,
            name: isSupport ? 'Mingo Support' : (otherUser?.name || otherUser?.username || 'Unknown'),
            gender: otherUser?.gender,
            avatarIndex: otherUser?.avatarIndex,
            image: otherUser?.profileImage,
            lastMessage: conversationLastMessage.content || 'Say hello!',
            time: conversationLastMessage.createdAt,
            unread: unreadCount,
            isOnline: !!listenerOnlineMap[otherUser?._id?.toString()],
            sessionStatus: 'none',
            duration: 0,
            startTime: null,
            endTime: null,
            listenerEarnings: 0,
            coinsDeducted: 0,
            isAdmin: isSupport
          });
        }
      }

      // Sort cards by time (newest first)
      cards.sort((a, b) => new Date(b.time) - new Date(a.time));

      return ApiResponse.success(res, cards, 'Conversations retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * Load the messages that belong to a single chat session window.
   * @param {String} conversationId - the conversation the session belongs to
   * @param {Date} startTime - session start
   * @param {Date|null} endTime - session end (null = still running)
   */
  static async _sessionMessages(conversationId, startTime, endTime) {
    const query = {
      conversationId,
      createdAt: { $gte: startTime },
    };
    if (endTime) {
      query.createdAt.$lte = endTime;
    }
    return Message.find(query).sort({ createdAt: 1 }).populate('sender', '_id name username');
  }

  /**
   * Find the most recent chat session between the two participants that has
   * ended (completed / cancelled). Used to scope the "current phase" — the
   * period after the last session, during which the user gets one free message.
   */
  static async _lastEndedChatSession(participantIds) {
    const Session = require('../models/sessionModel');
    return Session.findOne({
      userId: { $in: participantIds },
      listenerId: { $in: participantIds },
      callType: 'chat',
      status: { $in: ['completed', 'cancelled'] },
      endTime: { $ne: null }, // only sessions that actually ended
    }).sort({ endTime: -1 });
  }

  static async getMessages(req, res, next) {
    try {
      const messages = await Message.find({
        conversationId: req.params.id
      })
      .sort({ createdAt: 1 });

      
      await Conversation.findByIdAndUpdate(req.params.id, {
        [`unreadCount.${req.user.id}`]: 0
      });

      try {
        const sseService = require('../services/sseService');
        sseService.notifyUser(req.user.id);
      } catch (sseErr) {
        console.error('SSE notification error in getMessages:', sseErr);
      }

      return ApiResponse.success(res, messages, 'Messages retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  static async initiateConversation(req, res, next) {
    try {
      const { targetId, sessionId } = req.body;
      if (!targetId) {
        return ApiResponse.validationError(res, 'targetId is required');
      }

      let conversation = null;
      const mongoose = require('mongoose');

      if (mongoose.Types.ObjectId.isValid(targetId)) {
        conversation = await Conversation.findById(targetId);
      }

      if (!conversation && mongoose.Types.ObjectId.isValid(targetId)) {
        const userExists = await User.findById(targetId);
        if (userExists) {
          conversation = await Conversation.findOne({
            participants: { $all: [req.user.id, targetId] }
          });

          if (!conversation) {
            conversation = await Conversation.create({
              participants: [req.user.id, targetId],
              unreadCount: {},
              freeMessageUsed: {}
            });
          }
        }
      }

      if (!conversation) {
        return ApiResponse.notFound(res, 'Conversation or participant not found');
      }

      let messages = [];
      let returnedChatSession = conversation.chatSession;

      // ── Opened a SPECIFIC session page → only that session's messages ──
      // Validate the session actually belongs to this conversation (both
      // participants match) so a foreign/stale id can never scope the view.
      let scopedSession = null;
      if (sessionId) {
        const Session = require('../models/sessionModel');
        const session = await Session.findById(sessionId);
        const belongsToConversation = session &&
          conversation.participants.some(p => p.toString() === String(session.userId?._id || session.userId)) &&
          conversation.participants.some(p => p.toString() === String(session.listenerId?._id || session.listenerId));
        if (session && belongsToConversation) {
          scopedSession = session;
        }
      }

      if (scopedSession) {
        messages = await ChatController._sessionMessages(
          conversation._id,
          scopedSession.startTime,
          scopedSession.endTime || new Date()
        );

        returnedChatSession = {
          active: scopedSession.status === 'active',
          startedBy: scopedSession.userId,
          startTime: scopedSession.startTime,
          lastDeductionTime: scopedSession.lastDeductionTime,
          sessionId: scopedSession._id,
          status: scopedSession.status
        };
      } else {
        // ── Fresh page (no sessionId) → resume an active session if one is
        // running, otherwise scope to the current unpaid phase window. ──
        const Session = require('../models/sessionModel');
        const activeSession = await Session.findOne({
          userId: { $in: conversation.participants },
          listenerId: { $in: conversation.participants },
          callType: 'chat',
          status: 'active'
        });

        if (activeSession) {
          const startTime = activeSession.startTime;
          const coinsDeducted = activeSession.coinsDeducted || 10;
          const CHAT_SESSION_DURATION = 5 * 60 * 1000;
          const paidBlocks = Math.ceil(coinsDeducted / 10);
          const paidDuration = paidBlocks * CHAT_SESSION_DURATION;
          const expirationTime = new Date(startTime).getTime() + paidDuration;

          if (Date.now() >= expirationTime) {
            activeSession.status = 'completed';
            activeSession.endTime = new Date(expirationTime);
            await activeSession.save();

            conversation.chatSession = {
              active: false,
              startedBy: null,
              startTime: null,
              lastDeductionTime: null,
              sessionId: null,
              status: 'none'
            };
            await conversation.save();

            returnedChatSession = conversation.chatSession;
          } else {
            messages = await ChatController._sessionMessages(
              conversation._id,
              activeSession.startTime,
              null
            );

            returnedChatSession = {
              active: true,
              startedBy: activeSession.userId,
              startTime: activeSession.startTime,
              lastDeductionTime: activeSession.lastDeductionTime,
              sessionId: activeSession._id,
              status: 'active'
            };
          }
        }

        // No active session → the current phase: everything sent after the
        // last ended session (the user's free-message window of a new session).
        // System messages are excluded so a fresh page never opens on top of a
        // stale "Session ended" / recharge banner from the previous session.
        if (!returnedChatSession || !returnedChatSession.active) {
          const lastEnded = await ChatController._lastEndedChatSession(conversation.participants);
          const phaseStart = (lastEnded && lastEnded.endTime) || conversation.createdAt;

          messages = await Message.find({
            conversationId: conversation._id,
            createdAt: { $gt: phaseStart },
            senderModel: { $ne: 'System' },
          })
            .sort({ createdAt: 1 })
            .populate('sender', '_id name username');

          returnedChatSession = {
            active: false,
            startedBy: lastEnded ? lastEnded.userId : null,
            startTime: null,
            lastDeductionTime: null,
            // Keep the last ended session's id so the client can tell that a
            // paid session already happened for this pair (listener gating).
            sessionId: lastEnded ? lastEnded._id : null,
            status: 'none'
          };
        }
      }

      await Conversation.findByIdAndUpdate(conversation._id, {
        [`unreadCount.${req.user.id}`]: 0
      });

      try {
        const sseService = require('../services/sseService');
        sseService.notifyUser(req.user.id);
      } catch (sseErr) {
        console.error('SSE notification error in initiateConversation:', sseErr);
      }

      let isSupport = false;
      let otherUser = null;
      const otherParticipantId = conversation.participants.find(p => p.toString() !== req.user.id.toString());
      if (otherParticipantId) {
        const otherUserObj = await User.findById(otherParticipantId).select('name username avatarIndex gender profileImage role');
        if (otherUserObj) {
          if (otherUserObj.role === 'ADMIN' || otherUserObj.role.endsWith('_ADMIN')) {
            isSupport = true;
          }
          otherUser = {
            id: otherUserObj._id,
            name: otherUserObj.name,
            username: otherUserObj.username,
            avatarIndex: otherUserObj.avatarIndex,
            gender: otherUserObj.gender,
            profileImage: otherUserObj.profileImage,
            role: otherUserObj.role,
          };
        }
      }

      return ApiResponse.success(res, {
        conversationId: conversation._id,
        participants: conversation.participants,
        chatSession: returnedChatSession,
        messages,
        otherUser,
        isAdmin: isSupport
      }, 'Conversation initiated successfully');
    } catch (err) {
      next(err);
    }
  }

  static async sseUnreadCount(req, res, next) {
    try {
      const userId = req.user.id;
      
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();
      
      const sseService = require('../services/sseService');
      sseService.addClient(userId, res);
      
      await sseService.sendUnreadCount(userId, res);
      
      const keepAlive = setInterval(() => {
        res.write(': keep-alive\n\n');
      }, 30000);
      
      req.on('close', () => {
        clearInterval(keepAlive);
        sseService.removeClient(userId, res);
        res.end();
      });
    } catch (err) {
      console.error('SSE endpoint error:', err);
      if (!res.headersSent) {
        next(err);
      }
    }
  }
}

module.exports = ChatController;

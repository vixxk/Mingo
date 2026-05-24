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
            sessionId: null,
            name: isSupport ? 'Mingo Support' : (otherUser?.name || otherUser?.username || 'Unknown'),
            gender: otherUser?.gender,
            avatarIndex: otherUser?.avatarIndex,
            image: otherUser?.profileImage,
            lastMessage: conv.lastMessage?.content || 'Say hello!',
            time: conv.lastMessage?.createdAt || conv.updatedAt,
            unread: unreadCount,
            isOnline: false,
            sessionStatus: 'none',
            isAdmin: isSupport
          });
        } else {
          // Get the most recent session
          const sortedSessions = [...convSessions].sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
          const session = sortedSessions[0];
          
          const sessionUser = session.userId;
          const sessionListener = session.listenerId;
          if (sessionUser && sessionListener) {
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

            // Find last message within this session's window
            const query = {
              conversationId: conv._id,
              createdAt: { $gte: session.startTime }
            };
            if (session.endTime) {
              query.createdAt.$lte = session.endTime;
            }

            let lastMsg = await Message.findOne(query).sort({ createdAt: -1 });
            if (!lastMsg) {
              lastMsg = conv.lastMessage;
            }

            // Check if there is a newer message after the most recent session ended
            const conversationLastMessage = conv.lastMessage;
            const isNewerMessageAfterSession = !session.active && 
              session.endTime && 
              conversationLastMessage && 
              new Date(conversationLastMessage.createdAt) > new Date(session.endTime);

            cards.push({
              id: conv._id,
              sessionId: isNewerMessageAfterSession ? null : session._id,
              name: isSupport ? 'Mingo Support' : (otherUser?.name || otherUser?.username || 'Unknown'),
              gender: otherUser?.gender,
              avatarIndex: otherUser?.avatarIndex,
              image: otherUser?.profileImage,
              lastMessage: isNewerMessageAfterSession ? (conversationLastMessage.content || 'Say hello!') : (lastMsg?.content || 'Session started'),
              time: isNewerMessageAfterSession ? conversationLastMessage.createdAt : (lastMsg?.createdAt || session.startTime),
              unread: isNewerMessageAfterSession ? unreadCount : (session.status === 'active' ? unreadCount : 0),
              isOnline: false,
              sessionStatus: isNewerMessageAfterSession ? 'none' : session.status,
              duration: session.duration,
              startTime: session.startTime,
              endTime: session.endTime,
              listenerEarnings: session.listenerEarnings || 0,
              coinsDeducted: session.coinsDeducted || 0,
              isAdmin: isSupport
            });
          }
        }
      }

      // Sort cards by time (newest first)
      cards.sort((a, b) => new Date(b.time) - new Date(a.time));

      return ApiResponse.success(res, cards, 'Conversations retrieved successfully');
    } catch (err) {
      next(err);
    }
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

      if (sessionId) {
        const Session = require('../models/sessionModel');
        const session = await Session.findById(sessionId);
        if (session) {
          // Load all messages of the conversation to show complete history
          messages = await Message.find({ conversationId: conversation._id }).sort({ createdAt: 1 }).populate('sender', '_id name username');
          
          returnedChatSession = {
            active: session.status === 'active',
            startedBy: session.userId,
            startTime: session.startTime,
            lastDeductionTime: session.lastDeductionTime,
            sessionId: session._id,
            status: session.status
          };
        }
      } else {
        // No sessionId passed: load ALL messages of the conversation
        messages = await Message.find({ conversationId: conversation._id })
          .sort({ createdAt: 1 })
          .populate('sender', '_id name username');

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
            returnedChatSession = {
              active: true,
              startedBy: activeSession.userId,
              startTime: activeSession.startTime,
              lastDeductionTime: activeSession.lastDeductionTime,
              sessionId: activeSession._id,
              status: 'active'
            };
          }
        } else {
          returnedChatSession = {
            active: false,
            startedBy: null,
            startTime: null,
            lastDeductionTime: null,
            sessionId: null,
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
      const otherParticipantId = conversation.participants.find(p => p.toString() !== req.user.id.toString());
      if (otherParticipantId) {
        const otherUserObj = await User.findById(otherParticipantId);
        if (otherUserObj && (otherUserObj.role === 'ADMIN' || otherUserObj.role.endsWith('_ADMIN'))) {
          isSupport = true;
        }
      }

      return ApiResponse.success(res, {
        conversationId: conversation._id,
        participants: conversation.participants,
        chatSession: returnedChatSession,
        messages,
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

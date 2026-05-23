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
        const isSupport = otherUser?.role === 'ADMIN';

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
          // Push cards for each session
          for (const session of convSessions) {
            const sessionUser = session.userId;
            const sessionListener = session.listenerId;
            if (!sessionUser || !sessionListener) continue;

            // Find last message within this session's window
            const query = {
              conversationId: conv._id,
              createdAt: { $gte: session.startTime }
            };
            if (session.endTime) {
              query.createdAt.$lte = session.endTime;
            }

            const lastMsg = await Message.findOne(query).sort({ createdAt: -1 });

            cards.push({
              id: conv._id,
              sessionId: session._id,
              name: isSupport ? 'Mingo Support' : (otherUser?.name || otherUser?.username || 'Unknown'),
              gender: otherUser?.gender,
              avatarIndex: otherUser?.avatarIndex,
              image: otherUser?.profileImage,
              lastMessage: lastMsg?.content || 'Session started',
              time: lastMsg?.createdAt || session.startTime,
              unread: session.status === 'active' ? unreadCount : 0,
              isOnline: false,
              sessionStatus: session.status,
              duration: session.duration,
              startTime: session.startTime,
              endTime: session.endTime,
              listenerEarnings: session.listenerEarnings || 0,
              coinsDeducted: session.coinsDeducted || 0,
              isAdmin: isSupport
            });
          }

          // Check if there is an active session
          const hasActiveSession = convSessions.some(s => s.status === 'active');
          if (!hasActiveSession) {
            // Find the most recent completed/cancelled session to check if there are newer messages
            const sortedSessions = [...convSessions].sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
            const mostRecentSession = sortedSessions[0];
            
            if (mostRecentSession && mostRecentSession.endTime) {
              // Check if the conversation has a newer message after the session ended
              const conversationLastMessage = conv.lastMessage;
              if (conversationLastMessage && new Date(conversationLastMessage.createdAt) > new Date(mostRecentSession.endTime)) {
                cards.push({
                  id: conv._id,
                  sessionId: null,
                  name: isSupport ? 'Mingo Support' : (otherUser?.name || otherUser?.username || 'Unknown'),
                  gender: otherUser?.gender,
                  avatarIndex: otherUser?.avatarIndex,
                  image: otherUser?.profileImage,
                  lastMessage: conversationLastMessage.content || 'Say hello!',
                  time: conversationLastMessage.createdAt,
                  unread: unreadCount,
                  isOnline: false,
                  sessionStatus: 'none',
                  isAdmin: isSupport
                });
              }
            }
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
          const query = {
            conversationId: conversation._id,
            createdAt: { $gte: session.startTime }
          };
          if (session.endTime) {
            query.createdAt.$lte = session.endTime;
          }
          messages = await Message.find(query).sort({ createdAt: 1 }).populate('sender', '_id name username');
          
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
        // No sessionId passed: load messages of current active session, or if none, those since the last completed session
        const Session = require('../models/sessionModel');
        const activeSession = await Session.findOne({
          $or: [{ userId: req.user.id }, { listenerId: req.user.id }],
          callType: 'chat',
          status: 'active'
        });

        if (activeSession) {
          messages = await Message.find({
            conversationId: conversation._id,
            createdAt: { $gte: activeSession.startTime }
          }).sort({ createdAt: 1 }).populate('sender', '_id name username');

          returnedChatSession = {
            active: true,
            startedBy: activeSession.userId,
            startTime: activeSession.startTime,
            lastDeductionTime: activeSession.lastDeductionTime,
            sessionId: activeSession._id,
            status: 'active'
          };
        } else {
          const lastEndedSession = await Session.findOne({
            $or: [{ userId: req.user.id }, { listenerId: req.user.id }],
            callType: 'chat',
            status: 'completed'
          }).sort({ endTime: -1 });

          const query = { conversationId: conversation._id };
          if (lastEndedSession && lastEndedSession.endTime) {
            query.createdAt = { $gt: lastEndedSession.endTime };
          }

          messages = await Message.find(query).sort({ createdAt: 1 }).populate('sender', '_id name username');

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

      return ApiResponse.success(res, {
        conversationId: conversation._id,
        participants: conversation.participants,
        chatSession: returnedChatSession,
        messages
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

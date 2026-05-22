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
      .populate('participants', 'name username avatarIndex gender profileImage')
      .populate('lastMessage')
      .sort({ updatedAt: -1 });

      const cards = [];
      const conversationsWithSessions = new Set();

      for (const session of chatSessions) {
        const sessionUser = session.userId;
        const sessionListener = session.listenerId;
        if (!sessionUser || !sessionListener) continue;

        // Find the conversation for this session
        const conv = conversations.find(c => 
          c.participants.some(p => p._id.toString() === sessionUser._id.toString()) &&
          c.participants.some(p => p._id.toString() === sessionListener._id.toString())
        );

        if (!conv) continue;
        conversationsWithSessions.add(conv._id.toString());

        const otherUser = sessionUser._id.toString() === userId ? sessionListener : sessionUser;
        const unreadCount = conv.unreadCount ? (conv.unreadCount.get(userId) || 0) : 0;

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
          name: otherUser?.name || otherUser?.username || 'Unknown',
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
          endTime: session.endTime
        });
      }

      // Add default cards for conversations that do not have any sessions yet
      for (const conv of conversations) {
        if (!conversationsWithSessions.has(conv._id.toString())) {
          const otherUser = conv.participants.find(p => p._id.toString() !== userId);
          const unreadCount = conv.unreadCount ? (conv.unreadCount.get(userId) || 0) : 0;

          cards.push({
            id: conv._id,
            sessionId: null,
            name: otherUser?.name || otherUser?.username || 'Unknown',
            gender: otherUser?.gender,
            avatarIndex: otherUser?.avatarIndex,
            image: otherUser?.profileImage,
            lastMessage: conv.lastMessage?.content || 'Say hello!',
            time: conv.lastMessage?.createdAt || conv.updatedAt,
            unread: unreadCount,
            isOnline: false,
            sessionStatus: 'none'
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

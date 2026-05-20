const Conversation = require('../models/conversationModel');
const Message = require('../models/messageModel');
const User = require('../models/userModel');
const ApiResponse = require('../utils/apiResponse');

class ChatController {
  static async getConversations(req, res, next) {
    try {
      const conversations = await Conversation.find({
        participants: req.user.id
      })
      .populate('participants', 'name username avatarIndex gender profileImage')
      .populate('lastMessage')
      .sort({ updatedAt: -1 });
      
      const formattedConversations = conversations.map(conv => {
        const otherUser = conv.participants.find(p => p._id.toString() !== req.user.id);
        const unreadCount = conv.unreadCount ? (conv.unreadCount.get(req.user.id) || 0) : 0;
        
        return {
          id: conv._id,
          name: otherUser?.name || otherUser?.username || 'Unknown',
          gender: otherUser?.gender,
          avatarIndex: otherUser?.avatarIndex,
          image: otherUser?.profileImage,
          lastMessage: conv.lastMessage?.content || 'Started a conversation',
          time: conv.lastMessage?.createdAt || conv.updatedAt,
          unread: unreadCount,
          isOnline: false 
        };
      });

      return ApiResponse.success(res, formattedConversations, 'Conversations retrieved successfully');
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
      const { targetId } = req.body;
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

      const messages = await Message.find({
        conversationId: conversation._id
      }).sort({ createdAt: 1 }).populate('sender', '_id name username');

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
        chatSession: conversation.chatSession,
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

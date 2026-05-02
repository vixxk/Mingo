const Conversation = require('../models/conversationModel');
const Message = require('../models/messageModel');
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

      return ApiResponse.success(res, messages, 'Messages retrieved successfully');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = ChatController;

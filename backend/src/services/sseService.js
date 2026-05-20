const Conversation = require('../models/conversationModel');

const clients = new Map(); // key: userId (string), value: Set of res objects

const sseService = {
  addClient: (userId, res) => {
    const userIdStr = userId.toString();
    if (!clients.has(userIdStr)) {
      clients.set(userIdStr, new Set());
    }
    clients.get(userIdStr).add(res);
    console.log(`[SSE] Client added for user ${userIdStr}. Total clients: ${clients.get(userIdStr).size}`);
  },

  removeClient: (userId, res) => {
    const userIdStr = userId.toString();
    if (clients.has(userIdStr)) {
      const userClients = clients.get(userIdStr);
      userClients.delete(res);
      console.log(`[SSE] Client removed for user ${userIdStr}. Remaining: ${userClients.size}`);
      if (userClients.size === 0) {
        clients.delete(userIdStr);
      }
    }
  },

  sendUnreadCount: async (userId, res) => {
    try {
      const conversations = await Conversation.find({ participants: userId });
      let totalUnread = 0;
      conversations.forEach(conv => {
        if (conv.unreadCount) {
          totalUnread += conv.unreadCount.get(userId.toString()) || 0;
        }
      });
      res.write(`data: ${JSON.stringify({ unreadCount: totalUnread })}\n\n`);
    } catch (err) {
      console.error(`[SSE] Error sending unread count to ${userId}:`, err);
    }
  },

  notifyUser: async (userId) => {
    const userIdStr = userId.toString();
    const userClients = clients.get(userIdStr);
    if (!userClients || userClients.size === 0) return;

    try {
      const conversations = await Conversation.find({ participants: userIdStr });
      let totalUnread = 0;
      conversations.forEach(conv => {
        if (conv.unreadCount) {
          totalUnread += conv.unreadCount.get(userIdStr) || 0;
        }
      });

      console.log(`[SSE] Notifying user ${userIdStr} of new unread count: ${totalUnread}`);
      const data = JSON.stringify({ unreadCount: totalUnread });
      for (const res of userClients) {
        res.write(`data: ${data}\n\n`);
      }
    } catch (err) {
      console.error(`[SSE] Error broadcasting to ${userIdStr}:`, err);
    }
  }
};

module.exports = sseService;

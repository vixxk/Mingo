const Conversation = require('../models/conversationModel');

const clients = new Map(); // key: userId (string), value: Set of res objects
const statusClients = new Set(); // value: res objects

let ioRef = null;

const buildUnreadData = async (userId) => {
  const userIdStr = userId.toString();
  const conversations = await Conversation.find({ participants: userIdStr });
  let totalUnread = 0;
  let unreadPeopleCount = 0;
  conversations.forEach(conv => {
    if (conv.unreadCount) {
      const count = conv.unreadCount.get ? (conv.unreadCount.get(userIdStr) || 0) : (conv.unreadCount[userIdStr] || 0);
      totalUnread += count;
      if (count > 0) unreadPeopleCount++;
    }
  });
  return { unreadCount: totalUnread, unreadPeopleCount };
};

const sseService = {
  setIo: (io) => {
    ioRef = io;
  },

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

  addStatusClient: (res) => {
    statusClients.add(res);
    console.log(`[SSE] Status client added. Total status clients: ${statusClients.size}`);
  },

  removeStatusClient: (res) => {
    statusClients.delete(res);
    console.log(`[SSE] Status client removed. Remaining: ${statusClients.size}`);
  },

  broadcastListenerStatus: (userId, isOnline, isBusy = false, busySince = null) => {
    const data = JSON.stringify({ userId: userId.toString(), isOnline, isBusy, busySince });
    console.log(`[SSE] Broadcasting listener status change: ${data}`);
    for (const res of statusClients) {
      try {
        res.write(`data: ${data}\n\n`);
      } catch (err) {
        console.error('[SSE] Error writing to status client:', err.message);
      }
    }
  },

  sendUnreadCount: async (userId, res) => {
    try {
      const data = await buildUnreadData(userId);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (err) {
      console.error(`[SSE] Error sending unread count to ${userId}:`, err);
    }
  },

  notifyUser: async (userId) => {
    const userIdStr = userId.toString();
    let data;
    try {
      data = await buildUnreadData(userId);
    } catch (err) {
      console.error(`[SSE] Error building unread data for ${userIdStr}:`, err);
      return;
    }

    const userClients = clients.get(userIdStr);
    if (userClients && userClients.size > 0) {
      console.log(`[SSE] Notifying user ${userIdStr}: ${data.unreadCount} msgs from ${data.unreadPeopleCount} people`);
      for (const res of userClients) {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      }
    }

    // Real-time push over socket.io as well (more reliable on RN than SSE streaming)
    if (ioRef) {
      ioRef.to(`user_${userIdStr}`).emit('unread_count_update', data);
    }
  }
};

module.exports = sseService;

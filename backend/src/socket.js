const { Server } = require('socket.io');
const Message = require('./models/messageModel');
const Conversation = require('./models/conversationModel');
const jwt = require('jsonwebtoken');
const config = require('./config/env');

let io;

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
      const { conversationId, senderId, senderModel, content, type, mediaUrl } = data;
      
      try {
        const message = new Message({
          conversationId,
          sender: senderId,
          senderModel,
          content,
          type: type || 'text',
          mediaUrl
        });
        await message.save();

        await Conversation.findByIdAndUpdate(conversationId, { lastMessage: message._id });

        io.to(conversationId).emit('receive_message', message);
      } catch (error) {
        console.error('Socket message error:', error);
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

    socket.on('call_incoming', (data) => {
      const { listenerId, callData } = data;
      io.to(`user_${listenerId}`).emit('incoming_call', callData);
    });

    socket.on('call_accepted', (data) => {
      const { userId, sessionId } = data;
      io.to(`user_${userId}`).emit('call_accepted', { sessionId });
    });

    socket.on('call_rejected', (data) => {
      const { userId, reason } = data;
      io.to(`user_${userId}`).emit('call_rejected', { reason });
    });

    socket.on('call_ended', (data) => {
      const { roomId } = data;
      io.to(roomId).emit('call_ended', data);
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });
};

const getIo = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

module.exports = { initSocket, getIo };

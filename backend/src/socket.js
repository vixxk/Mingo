const { Server } = require('socket.io');
const Message = require('./models/messageModel');
const Conversation = require('./models/conversationModel');

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

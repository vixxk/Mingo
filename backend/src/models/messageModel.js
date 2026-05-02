const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    senderModel: {
      type: String,
      required: true,
      enum: ['User'], 
      default: 'User'
    },
    content: {
      type: String,
      default: '',
    },
    type: {
      type: String,
      enum: ['text', 'image', 'audio', 'sticker'],
      default: 'text',
    },
    mediaUrl: {
      type: String,
      default: null,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

messageSchema.index({ conversationId: 1, createdAt: 1 });

module.exports = mongoose.model('Message', messageSchema);

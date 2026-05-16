const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    participants: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    }],
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
    },
    unreadCount: {
      type: Map,
      of: Number,
      default: {},
    },
    // Track which users have used their free first message in this conversation
    freeMessageUsed: {
      type: Map,
      of: Boolean,
      default: {},
    },
    // Chat session tracking (timed billing)
    chatSession: {
      active: { type: Boolean, default: false },
      startedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      startTime: { type: Date, default: null },
      lastDeductionTime: { type: Date, default: null },
      // Total coins deducted in this session
      totalCoinsDeducted: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
  }
);

conversationSchema.index({ participants: 1 });
conversationSchema.index({ updatedAt: -1 });

module.exports = mongoose.model('Conversation', conversationSchema);

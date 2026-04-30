const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, required: true }, 
  senderModel: { type: String, required: true, enum: ['User', 'Listener'] },
  content: { type: String }, 
  type: { type: String, enum: ['text', 'image', 'sticker'], default: 'text' },
  mediaUrl: { type: String }, 
  read: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);

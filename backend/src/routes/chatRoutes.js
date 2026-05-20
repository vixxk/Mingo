const express = require('express');
const router = express.Router();
const ChatController = require('../controllers/chatController');
const { authenticate } = require('../middlewares/auth');

router.get('/conversations', authenticate, ChatController.getConversations);
router.post('/conversations/init', authenticate, ChatController.initiateConversation);
router.get('/conversations/:id/messages', authenticate, ChatController.getMessages);
router.get('/unread-count/sse', authenticate, ChatController.sseUnreadCount);

module.exports = router;

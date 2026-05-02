const express = require('express');
const router = express.Router();
const ChatController = require('../controllers/chatController');
const { authenticate } = require('../middlewares/auth');

router.get('/conversations', authenticate, ChatController.getConversations);
router.get('/conversations/:id/messages', authenticate, ChatController.getMessages);

module.exports = router;

const express = require('express');
const router = express.Router();
const ListenerController = require('../controllers/listenerController');
const { authenticate } = require('../middlewares/auth');

router.get('/', authenticate, ListenerController.getRecommended);
router.post('/go-online', authenticate, ListenerController.goOnline);
router.post('/go-offline', authenticate, ListenerController.goOffline);
router.post('/heartbeat', authenticate, ListenerController.heartbeat);
router.get('/:id', authenticate, ListenerController.getProfile);
router.get('/:id/public-profile', authenticate, ListenerController.getPublicProfile);

module.exports = router;

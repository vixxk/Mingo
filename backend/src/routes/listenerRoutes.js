const express = require('express');
const router = express.Router();
const ListenerController = require('../controllers/listenerController');
const { authenticate, authorize } = require('../middlewares/auth');

router.post('/go-online', authenticate, authorize('LISTENER'), ListenerController.goOnline);

router.post('/go-offline', authenticate, authorize('LISTENER'), ListenerController.goOffline);

router.post('/heartbeat', authenticate, authorize('LISTENER'), ListenerController.heartbeat);

module.exports = router;

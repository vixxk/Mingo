const express = require('express');
const router = express.Router();
const ListenerController = require('../controllers/listenerController');
const { authenticate } = require('../middlewares/auth');

router.get('/', authenticate, ListenerController.getRecommended);

router.get('/:id', authenticate, ListenerController.getProfile);

module.exports = router;

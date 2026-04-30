const express = require('express');
const router = express.Router();
const CallController = require('../controllers/callController');
const { authenticate, authorize } = require('../middlewares/auth');
const { callStartValidation, callEndValidation } = require('../utils/validators');

router.post('/start', authenticate, authorize('USER'), callStartValidation, CallController.startCall);

router.post('/end', authenticate, authorize('USER', 'LISTENER'), callEndValidation, CallController.endCall);

router.get('/history', authenticate, CallController.getHistory);

router.get('/:sessionId', authenticate, CallController.getSession);

module.exports = router;

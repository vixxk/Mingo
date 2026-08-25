const express = require('express');
const router = express.Router();
const CallController = require('../controllers/callController');
const { authenticate, authorize, optionalAuthenticate } = require('../middlewares/auth');
const { callStartValidation, callEndValidation } = require('../utils/validators');

router.post('/start', authenticate, authorize('USER'), callStartValidation, CallController.startCall);

router.post('/end', authenticate, authorize('USER', 'LISTENER'), callEndValidation, CallController.endCall);

router.post('/reject', optionalAuthenticate, CallController.rejectCall);

router.get('/history', authenticate, CallController.getHistory);

router.get('/active/session', authenticate, CallController.getActiveSession);

router.get('/active/incoming', authenticate, CallController.getActiveIncoming);

router.get('/:sessionId', authenticate, CallController.getSession);

module.exports = router;

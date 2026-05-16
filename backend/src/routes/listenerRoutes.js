const express = require('express');
const router = express.Router();
const ListenerController = require('../controllers/listenerController');
const { authenticate, authorize } = require('../middlewares/auth');

// Online/Offline management
router.post('/go-online', authenticate, authorize('LISTENER'), ListenerController.goOnline);
router.post('/go-offline', authenticate, authorize('LISTENER'), ListenerController.goOffline);
router.post('/heartbeat', authenticate, authorize('LISTENER'), ListenerController.heartbeat);

// Listener own profile management
router.get('/my-profile', authenticate, authorize('LISTENER'), ListenerController.getMyProfile);
router.patch('/public-profile', authenticate, authorize('LISTENER'), ListenerController.updatePublicProfile);
router.patch('/update-settings', authenticate, authorize('LISTENER'), ListenerController.updateSettings);
router.post('/public-profile/submit', authenticate, authorize('LISTENER'), ListenerController.submitProfileForApproval);

// Media upload
router.post('/upload-media', authenticate, authorize('LISTENER'), ListenerController.getMediaUploadUrls);

module.exports = router;

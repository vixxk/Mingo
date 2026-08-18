const express = require('express');
const router = express.Router();
const ListenerController = require('../controllers/listenerController');
const PayoutController = require('../controllers/payoutController');
const { authenticate, authorize } = require('../middlewares/auth');

// Online/Offline management
router.post('/go-online', authenticate, authorize('LISTENER'), ListenerController.goOnline);
router.post('/go-offline', authenticate, authorize('LISTENER'), ListenerController.goOffline);
router.post('/set-busy', authenticate, authorize('LISTENER'), ListenerController.setBusy);
router.post('/heartbeat', authenticate, authorize('LISTENER'), ListenerController.heartbeat);

// Listener own profile management
router.get('/my-profile', authenticate, authorize('LISTENER'), ListenerController.getMyProfile);
router.patch('/public-profile', authenticate, authorize('LISTENER'), ListenerController.updatePublicProfile);
router.patch('/update-settings', authenticate, authorize('LISTENER'), ListenerController.updateSettings);
router.post('/public-profile/submit', authenticate, authorize('LISTENER'), ListenerController.submitProfileForApproval);

// Earnings reconciliation (ledger-backed dashboard stats)
router.get('/earnings-stats', authenticate, authorize('LISTENER'), ListenerController.getEarningsStats);

// Payouts (earnings withdrawal flow)
router.get('/payout/dashboard', authenticate, authorize('LISTENER'), PayoutController.getDashboard);
router.post('/payout/bank-details', authenticate, authorize('LISTENER'), PayoutController.saveBankDetails);
router.post('/payout/request', authenticate, authorize('LISTENER'), PayoutController.createRequest);
router.get('/payout/requests', authenticate, authorize('LISTENER'), PayoutController.getRequests);
router.get('/payout/notifications', authenticate, authorize('LISTENER'), PayoutController.getNotifications);
router.patch('/payout/notifications/read-all', authenticate, authorize('LISTENER'), PayoutController.markAllNotificationsRead);

// Media upload
router.post('/upload-media', authenticate, authorize('LISTENER'), ListenerController.getMediaUploadUrls);

module.exports = router;

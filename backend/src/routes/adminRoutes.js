const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/adminController');
const { authenticate, authorize } = require('../middlewares/auth');

const ADMIN_ROLES = ['ADMIN', 'SUPPORT_ADMIN', 'FINANCE_ADMIN', 'MODERATOR_ADMIN'];

router.use(authenticate, authorize(...ADMIN_ROLES));

router.get('/stats', AdminController.getStats);
router.get('/export-data', AdminController.getExportData);
router.get('/users', AdminController.getUsers);
router.get('/listeners', AdminController.getListeners);
router.get('/listeners/:id', AdminController.getListenerDetail);
router.patch('/listeners/:id/approve', AdminController.approveListener);
router.patch('/listeners/:id/reject', AdminController.rejectListener);
router.patch('/listeners/:id/best-choice', AdminController.toggleBestChoice);
router.patch('/listeners/:id/verify', AdminController.toggleVerified);
router.patch('/users/:id/ban', AdminController.toggleBanUser);
router.post('/users/:id/message', AdminController.sendAdminMessage);
router.patch('/users/:id/interests', AdminController.updateUserInterests);
router.delete('/users/:id', AdminController.deleteUser);
router.get('/activities', AdminController.getActivities);
router.get('/reports', AdminController.getReports);
router.patch('/reports/:id', AdminController.updateReport);
router.get('/banned', AdminController.getBannedMembers);

// Wallet & Coins
router.get('/coin-packages', AdminController.getCoinPackages);
router.put('/coin-packages', AdminController.updateCoinPackages);
router.post('/coin-packages', AdminController.addCoinPackage);
router.post('/coin-packages/reset', AdminController.resetCoinPackages);
router.patch('/coin-packages/:id', AdminController.updateCoinPackage);
router.delete('/coin-packages/:id', AdminController.deleteCoinPackage);

// Payouts
router.get('/payouts', AdminController.getPayouts);
router.patch('/payouts/:id', AdminController.updatePayoutStatus);

// Settings
router.get('/settings', AdminController.getSettings);
router.patch('/settings', AdminController.updateSettings);

// Notifications
router.post('/notifications/send', AdminController.sendPushNotification);
router.get('/notifications/campaigns', AdminController.getCampaigns);

// Profile Approvals
router.get('/profile-approvals', AdminController.getProfileApprovals);
router.patch('/profile-approvals/:id/approve', AdminController.approveProfileChanges);
router.patch('/profile-approvals/:id/reject', AdminController.rejectProfileChanges);

// Sessions & Ratings
router.get('/sessions', AdminController.getSessions);
router.get('/ratings', AdminController.getRatings);

module.exports = router;

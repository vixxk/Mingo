const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/adminController');
const { authenticate, authorize } = require('../middlewares/auth');

router.use(authenticate, authorize('ADMIN'));

router.get('/stats', AdminController.getStats);
router.get('/users', AdminController.getUsers);
router.get('/listeners', AdminController.getListeners);
router.patch('/listeners/:id/approve', AdminController.approveListener);
router.patch('/listeners/:id/reject', AdminController.rejectListener);
router.patch('/listeners/:id/best-choice', AdminController.toggleBestChoice);
router.patch('/listeners/:id/verify', AdminController.toggleVerified);
router.patch('/users/:id/ban', AdminController.toggleBanUser);
router.get('/activities', AdminController.getActivities);
router.get('/reports', AdminController.getReports);
router.patch('/reports/:id', AdminController.updateReport);
router.get('/banned', AdminController.getBannedMembers);

module.exports = router;

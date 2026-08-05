const express = require('express');
const router = express.Router();
const AdController = require('../controllers/adController');
const { authenticate, authorize } = require('../middlewares/auth');

// Public route for mobile app
router.get('/active', AdController.getActiveAds);

// Admin routes
router.get('/', authenticate, authorize('ADMIN'), AdController.getAllAds);
router.post('/', authenticate, authorize('ADMIN'), AdController.createAd);
router.put('/:id', authenticate, authorize('ADMIN'), AdController.updateAd);
router.delete('/:id', authenticate, authorize('ADMIN'), AdController.deleteAd);
router.post('/upload-url', authenticate, authorize('ADMIN'), AdController.getAdUploadUrl);

module.exports = router;

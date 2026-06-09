const express = require('express');
const router = express.Router();
const UserController = require('../controllers/userController');
const { authenticate } = require('../middlewares/auth');

router.patch('/profile', authenticate, UserController.updateProfile);
router.patch('/push-token', authenticate, UserController.updatePushToken);
router.post('/apply-listener', authenticate, UserController.applyAsListener);
router.post('/get-upload-url', authenticate, UserController.getUploadUrl);
router.post('/favourite', authenticate, UserController.toggleFavourite);
router.get('/favourites', authenticate, UserController.getFavourites);
router.post('/report', authenticate, UserController.submitReport);

// Block / Unblock
router.post('/block', authenticate, UserController.blockUser);
router.post('/unblock', authenticate, UserController.unblockUser);
router.get('/blocked', authenticate, UserController.getBlockedUsers);

// Account Deletion
router.delete('/delete-account', authenticate, UserController.deleteAccount);

module.exports = router;

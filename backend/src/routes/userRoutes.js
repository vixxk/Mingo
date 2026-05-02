const express = require('express');
const router = express.Router();
const UserController = require('../controllers/userController');
const { authenticate } = require('../middlewares/auth');

router.patch('/profile', authenticate, UserController.updateProfile);
router.post('/apply-listener', authenticate, UserController.applyAsListener);
router.post('/favourite', authenticate, UserController.toggleFavourite);
router.get('/favourites', authenticate, UserController.getFavourites);
router.post('/report', authenticate, UserController.submitReport);

module.exports = router;

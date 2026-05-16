const express = require('express');
const router = express.Router();
const GiftController = require('../controllers/giftController');
const { authenticate } = require('../middlewares/auth');

router.get('/', authenticate, GiftController.getAllGifts);
router.post('/send', authenticate, GiftController.sendGift);

module.exports = router;

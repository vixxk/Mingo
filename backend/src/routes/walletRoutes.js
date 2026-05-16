const express = require('express');
const router = express.Router();
const WalletController = require('../controllers/walletController');
const { authenticate } = require('../middlewares/auth');

router.get('/balance', authenticate, WalletController.getBalance);
router.get('/check-balance', authenticate, WalletController.checkBalance);
router.get('/packages', authenticate, WalletController.getPackages);
router.post('/purchase', authenticate, WalletController.purchaseCoins);
router.get('/transactions', authenticate, WalletController.getTransactions);

module.exports = router;

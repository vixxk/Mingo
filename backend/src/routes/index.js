const express = require('express');
console.log('DEBUG: Loading routes/index.js');
const router = express.Router();

const authRoutes = require('./authRoutes');
const listenerRoutes = require('./listenerRoutes');
const listenersRoutes = require('./listenersRoutes');
const matchRoutes = require('./matchRoutes');
const callRoutes = require('./callRoutes');
const ratingRoutes = require('./ratingRoutes');
const adminRoutes = require('./adminRoutes');
const walletRoutes = require('./walletRoutes');
const userRoutes = require('./userRoutes');
const chatRoutes = require('./chatRoutes');
const notificationRoutes = require('./notificationRoutes');
const giftRoutes = require('./giftRoutes');

router.use('/auth', authRoutes);
router.use('/listener', listenerRoutes);
router.use('/listeners', listenersRoutes);
router.use('/match', matchRoutes);
router.use('/call', callRoutes);
router.use('/rating', ratingRoutes);
router.use('/admin', adminRoutes);
router.use('/wallet', walletRoutes);
router.use('/user', userRoutes);
router.use('/chat', chatRoutes);
router.use('/notifications', notificationRoutes);
router.use('/gifts', giftRoutes);

router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Mingo API is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

module.exports = router;

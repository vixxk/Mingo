const express = require('express');
const router = express.Router();


const authRoutes = require('./authRoutes');
const listenerRoutes = require('./listenerRoutes');
const listenersRoutes = require('./listenersRoutes');
const matchRoutes = require('./matchRoutes');
const callRoutes = require('./callRoutes');
const ratingRoutes = require('./ratingRoutes');


router.use('/auth', authRoutes);
router.use('/listener', listenerRoutes);
router.use('/listeners', listenersRoutes);
router.use('/match', matchRoutes);
router.use('/call', callRoutes);
router.use('/rating', ratingRoutes);


router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Mingo API is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

module.exports = router;

const express = require('express');
const router = express.Router();
const MatchController = require('../controllers/matchController');
const { authenticate, authorize } = require('../middlewares/auth');

router.post('/', authenticate, authorize('USER'), MatchController.findMatch);

module.exports = router;

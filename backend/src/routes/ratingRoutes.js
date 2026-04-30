const express = require('express');
const router = express.Router();
const RatingController = require('../controllers/ratingController');
const { authenticate, authorize } = require('../middlewares/auth');
const { ratingValidation } = require('../utils/validators');

router.post('/', authenticate, authorize('USER'), ratingValidation, RatingController.submitRating);

router.get('/listener/:listenerId', authenticate, RatingController.getListenerRatings);

module.exports = router;

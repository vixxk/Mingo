const RatingService = require('../services/ratingService');
const ApiResponse = require('../utils/apiResponse');

class RatingController {
    static async submitRating(req, res, next) {
    try {
      const { sessionId, rating, feedback } = req.body;
      const result = await RatingService.submitRating({
        sessionId,
        userId: req.user.id,
        rating,
        feedback,
      });
      return ApiResponse.created(res, result, 'Rating submitted successfully');
    } catch (err) {
      next(err);
    }
  }

    static async getListenerRatings(req, res, next) {
    try {
      const limit = parseInt(req.query.limit, 10) || 20;
      const offset = parseInt(req.query.offset, 10) || 0;
      const ratings = await RatingService.getListenerRatings(
        req.params.listenerId,
        limit,
        offset
      );
      return ApiResponse.success(res, ratings, 'Ratings retrieved');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = RatingController;

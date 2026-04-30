const MatchingService = require('../services/matchingService');
const ApiResponse = require('../utils/apiResponse');

class MatchController {
    static async findMatch(req, res, next) {
    try {
      const match = await MatchingService.findMatch(req.user.id);
      return ApiResponse.success(res, match, 'Match found');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = MatchController;

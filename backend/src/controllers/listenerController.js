const PresenceService = require('../services/presenceService');
const ListenerService = require('../services/listenerService');
const ApiResponse = require('../utils/apiResponse');

class ListenerController {
    static async goOnline(req, res, next) {
    try {
      const result = await PresenceService.goOnline(req.user.id);
      return ApiResponse.success(res, result, 'You are now online');
    } catch (err) {
      next(err);
    }
  }

    static async goOffline(req, res, next) {
    try {
      const result = await PresenceService.goOffline(req.user.id);
      return ApiResponse.success(res, result, 'You are now offline');
    } catch (err) {
      next(err);
    }
  }

    static async heartbeat(req, res, next) {
    try {
      const result = await PresenceService.heartbeat(req.user.id);
      return ApiResponse.success(res, result, 'Heartbeat refreshed');
    } catch (err) {
      next(err);
    }
  }

    static async getRecommended(req, res, next) {
    try {
      const limit = parseInt(req.query.limit, 10) || 20;
      const listeners = await ListenerService.getRecommended(limit);
      return ApiResponse.success(res, listeners, 'Listeners retrieved');
    } catch (err) {
      next(err);
    }
  }

    static async getProfile(req, res, next) {
    try {
      const listener = await ListenerService.getProfile(req.params.id);
      return ApiResponse.success(res, listener, 'Listener profile retrieved');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = ListenerController;

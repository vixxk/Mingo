const CallService = require('../services/callService');
const ApiResponse = require('../utils/apiResponse');

class CallController {
    static async startCall(req, res, next) {
    try {
      const { listenerId } = req.body;
      const result = await CallService.startCall(req.user.id, listenerId);
      return ApiResponse.created(res, result, 'Call started successfully');
    } catch (err) {
      next(err);
    }
  }

    static async endCall(req, res, next) {
    try {
      const { sessionId } = req.body;
      const result = await CallService.endCall(sessionId, req.user.id);
      return ApiResponse.success(res, result, 'Call ended successfully');
    } catch (err) {
      next(err);
    }
  }

    static async getHistory(req, res, next) {
    try {
      const limit = parseInt(req.query.limit, 10) || 20;
      const offset = parseInt(req.query.offset, 10) || 0;

      let history;
      if (req.user.role === 'LISTENER') {
        history = await CallService.getListenerHistory(req.user.id, limit, offset);
      } else {
        history = await CallService.getUserHistory(req.user.id, limit, offset);
      }

      return ApiResponse.success(res, history, 'Call history retrieved');
    } catch (err) {
      next(err);
    }
  }

    static async getSession(req, res, next) {
    try {
      const session = await CallService.getSession(req.params.sessionId);
      return ApiResponse.success(res, session, 'Session details retrieved');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = CallController;

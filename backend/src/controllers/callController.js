const CallService = require('../services/callService');
const ApiResponse = require('../utils/apiResponse');

class CallController {
    static async startCall(req, res, next) {
    try {
      const { listenerId, callType } = req.body;
      const result = await CallService.startCall(req.user.id, listenerId, callType || 'audio');
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

    static async rejectCall(req, res, next) {
    try {
      const { sessionId, reason } = req.body;
      const result = await CallService.rejectCall(sessionId, req.user ? req.user.id : null, reason);
      return ApiResponse.success(res, result, 'Call rejected successfully');
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
      const { sessionId } = req.params;
      const mongoose = require('mongoose');
      if (!sessionId || sessionId === 'undefined' || sessionId === 'null' || !mongoose.Types.ObjectId.isValid(sessionId)) {
        throw new AppError('Invalid or missing session ID', 400);
      }
      const session = await CallService.getSession(sessionId);
      return ApiResponse.success(res, session, 'Session details retrieved');
    } catch (err) {
      next(err);
    }
  }

  static async getActiveSession(req, res, next) {
    try {
      const session = await CallService.getActiveSession(req.user.id);
      return ApiResponse.success(res, session, 'Active session checked');
    } catch (err) {
      next(err);
    }
  }

  static async getActiveIncoming(req, res, next) {
    try {
      const result = await CallService.getActiveIncomingCall(req.user.id);
      return ApiResponse.success(res, result, 'Active incoming call checked');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = CallController;

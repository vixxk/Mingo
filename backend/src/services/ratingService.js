const Rating = require('../models/ratingModel');
const Listener = require('../models/listenerModel');
const Session = require('../models/sessionModel');
const PresenceService = require('./presenceService');
const { redis, REDIS_KEYS } = require('../config/redis');
const AppError = require('../utils/appError');

class RatingService {
    static async submitRating({ sessionId, userId, rating, feedback }) {
    
    const session = await Session.findById(sessionId);
    if (!session) {
      throw new AppError('Session not found', 404);
    }

    
    if (session.userId.toString() !== userId.toString()) {
      throw new AppError('You can only rate sessions you participated in', 403);
    }

    
    // Allow rating for both completed and cancelled sessions. Cancelled sessions
    // happen when the call ends before billing deduction starts (e.g. very short calls).
    if (session.status !== 'completed' && session.status !== 'cancelled') {
      throw new AppError('Can only rate completed or cancelled sessions', 400);
    }

    
    const existingRating = await Rating.findBySessionId(sessionId);
    if (existingRating) {
      throw new AppError('Session already rated', 409);
    }

    
    const newRating = await Rating.create({
      sessionId,
      userId,
      listenerId: session.listenerId,
      rating,
      feedback,
    });

    // Also persist rating on the session document for quick admin access
    session.rating = rating;
    session.feedback = feedback;
    await session.save();

    
    const updatedListener = await Listener.updateRating(session.listenerId, rating);

    
    const listenerIdStr = session.listenerId.toString();
    const isOnline = await redis.sismember(REDIS_KEYS.LISTENERS_AVAILABLE, listenerIdStr);
    if (isOnline) {
      await PresenceService._updateScore(session.listenerId);
    }

    return {
      rating: {
        id: newRating._id,
        sessionId: newRating.sessionId,
        rating: newRating.rating,
        feedback: newRating.feedback,
        createdAt: newRating.createdAt,
      },
      listener: updatedListener
        ? {
            rating: updatedListener.rating,
            totalSessions: updatedListener.totalSessions,
          }
        : undefined,
    };
  }

    static async getListenerRatings(listenerId, limit = 20, offset = 0) {
    return Rating.findByListenerId(listenerId, limit, offset);
  }
}

module.exports = RatingService;

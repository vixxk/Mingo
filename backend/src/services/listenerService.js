const { redis, REDIS_KEYS } = require('../config/redis');
const Listener = require('../models/listenerModel');
const AppError = require('../utils/appError');

class ListenerService {
    static async getRecommended(limit = 20, userLanguage = 'English', blockedUserIds = []) {
    // Query MongoDB directly for online, approved listeners
    const listeners = await Listener.find({ status: 'approved', isOnline: true })
      .populate('userId', 'name username phone role gender avatarIndex isBanned');

    const results = [];

    for (const listener of listeners) {
      if (!listener.userId || listener.userId.isBanned) continue;

      // Skip blocked listeners
      const listenerUserId = (listener.userId._id || listener.userId).toString();
      if (blockedUserIds.includes(listenerUserId)) continue;

      // Compute dynamic recommended score
      const stats = await Listener.getStats(listener.userId._id);
      let recentActivity = 0.1;
      if (stats) {
        const { secondsSinceLastSession } = stats;
        if (secondsSinceLastSession < 3600) {
          recentActivity = 1.0;
        } else if (secondsSinceLastSession < 86400) {
          recentActivity = 0.5;
        }
      }

      const rating = listener.rating || 0;
      const totalSessions = listener.totalSessions || 0;

      const score =
        rating * 0.6 +
        Math.log(totalSessions + 1) * 0.2 +
        recentActivity * 0.2;

      const listenerLanguages = listener.publicProfile?.languages || ['English'];
      const speaksUserLanguage = listenerLanguages.some(
        (lang) => lang && lang.toLowerCase() === userLanguage.toLowerCase()
      );

      results.push({
        id: listener.userId._id || listener.userId,
        name: listener.displayName || listener.userId.name,
        username: listener.userId.username,
        gender: listener.userId.gender,
        avatarIndex: listener.userId.avatarIndex,
        rating: listener.rating,
        totalSessions: listener.totalSessions,
        isOnline: listener.isOnline,
        isBusy: listener.isBusy,
        isVerified: listener.verified,
        bestChoice: listener.bestChoice,
        audioEnabled: listener.audioEnabled,
        videoEnabled: listener.videoEnabled,
        chatEnabled: listener.chatEnabled,
        gradientColors: listener.gradientColors,
        hookline: listener.publicProfile?.hookline || '',
        profileImage: listener.publicProfile?.profileImage || listener.profileImage,
        languages: listenerLanguages,
        speaksUserLanguage,
        score,
      });
    }

    // Sort by language match first, then by recommended score descending
    results.sort((a, b) => {
      if (a.speaksUserLanguage && !b.speaksUserLanguage) return -1;
      if (!a.speaksUserLanguage && b.speaksUserLanguage) return 1;
      return b.score - a.score;
    });

    return results.slice(0, limit);
  }

    static async getProfile(listenerId) {
    const listener = await Listener.findByUserId(listenerId);
    if (!listener) {
      throw new AppError('Listener not found', 404);
    }

    return {
      id: listener.userId?._id || listener.userId,
      name: listener.userId?.name,
      displayName: listener.displayName,
      username: listener.userId?.username,
      gender: listener.userId?.gender,
      avatarIndex: listener.userId?.avatarIndex,
      email: listener.userId?.email,
      rating: listener.rating,
      totalSessions: listener.totalSessions,
      isOnline: listener.isOnline,
      verified: listener.verified,
      bestChoice: listener.bestChoice,
      introAudioUrl: listener.introAudioUrl,
      gradientColors: listener.gradientColors,
      earnings: listener.earnings,
      audioCalls: listener.audioCalls,
      videoCalls: listener.videoCalls,
      audioEnabled: listener.audioEnabled,
      videoEnabled: listener.videoEnabled,
      chatEnabled: listener.chatEnabled,
      profileImage: listener.publicProfile?.profileImage || listener.profileImage,
      publicProfile: listener.publicProfile || {},
      createdAt: listener.createdAt,
    };
  }
}

module.exports = ListenerService;

const PresenceService = require('../services/presenceService');
const ListenerService = require('../services/listenerService');
const Listener = require('../models/listenerModel');
const ApiResponse = require('../utils/apiResponse');
const AppError = require('../utils/appError');
const { generateUploadUrl, generateMultipleUploadUrls } = require('../utils/s3');

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
      const userLanguage = req.user?.language || 'English';
      
      // Get user's blocked list to filter out blocked listeners
      const User = require('../models/userModel');
      const currentUser = await User.findById(req.user.id).select('blockedUsers');
      const blockedUserIds = (currentUser?.blockedUsers || []).map(id => id.toString());
      
      const listeners = await ListenerService.getRecommended(limit, userLanguage, blockedUserIds);
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

  // ─── Public Profile Endpoints ───────────────────────────────

  /**
   * GET /listener/my-profile
   * Returns the listener's own profile data including draft, public, and status info.
   */
  static async getMyProfile(req, res, next) {
    try {
      const listener = await Listener.findByUserId(req.user.id);
      if (!listener) {
        throw new AppError('Listener profile not found', 404);
      }

      return ApiResponse.success(res, {
        id: listener._id,
        userId: listener.userId?._id || listener.userId,
        displayName: listener.displayName,
        bio: listener.bio,
        introAudioUrl: listener.introAudioUrl,
        profileImage: listener.profileImage,
        rating: listener.rating,
        totalSessions: listener.totalSessions,
        isOnline: listener.isOnline,
        status: listener.status,
        verified: listener.verified,
        bestChoice: listener.bestChoice,
        earnings: listener.earnings,
        audioEnabled: listener.audioEnabled,
        videoEnabled: listener.videoEnabled,
        chatEnabled: listener.chatEnabled,
        audioCalls: listener.audioCalls,
        videoCalls: listener.videoCalls,
        totalChats: listener.totalChats || 0,
        todayChats: listener.todayChats || 0,
        gradientColors: listener.gradientColors,
        publicProfile: listener.publicProfile,
        draftProfile: listener.draftProfile,
        profileStatus: listener.profileStatus,
        profileAdminNotes: listener.profileAdminNotes,
        profileSubmittedAt: listener.profileSubmittedAt,
        createdAt: listener.createdAt,
        name: listener.userId?.name,
        username: listener.userId?.username,
        gender: listener.userId?.gender,
        avatarIndex: listener.userId?.avatarIndex,
      }, 'Listener profile retrieved');
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /listener/public-profile
   * Save draft profile changes (does NOT go live yet).
   */
  static async updatePublicProfile(req, res, next) {
    try {
      const listener = await Listener.findOne({ userId: req.user.id });
      if (!listener) {
        throw new AppError('Listener profile not found', 404);
      }

      const {
        hookline,
        aboutMe,
        expertiseTags,
        languages,
        gradientColors,
        displayName,
      } = req.body;

      // Build the draft profile object
      const draft = listener.draftProfile || {};

      if (hookline !== undefined) draft.hookline = hookline;
      if (aboutMe !== undefined) draft.aboutMe = aboutMe;
      if (expertiseTags !== undefined) draft.expertiseTags = expertiseTags;
      if (languages !== undefined) draft.languages = languages;

      // ── Avatar-only policy: listeners can never set profile/cover/gallery
      // photos. Any previously stored photo fields are stripped from drafts so
      // old photos cannot be re-submitted for approval either.
      delete draft.galleryImages;
      delete draft.galleryVideos;
      delete draft.profileImage;
      delete draft.coverImage;

      listener.draftProfile = draft;
      listener.profileStatus = 'draft';

      // Gradient and display name update directly (no approval needed)
      if (gradientColors !== undefined) listener.gradientColors = gradientColors;
      if (displayName !== undefined) listener.displayName = displayName;

      await listener.save();

      return ApiResponse.success(res, {
        draftProfile: listener.draftProfile,
        profileStatus: listener.profileStatus,
        gradientColors: listener.gradientColors,
        displayName: listener.displayName,
      }, 'Draft profile saved');
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /listener/public-profile/submit
   * Submit draft profile for admin approval.
   */
  static async submitProfileForApproval(req, res, next) {
    try {
      const listener = await Listener.findOne({ userId: req.user.id });
      if (!listener) {
        throw new AppError('Listener profile not found', 404);
      }

      if (!listener.draftProfile) {
        throw new AppError('No draft profile to submit. Please save changes first.', 400);
      }

      // Validate minimum required fields
      if (!listener.draftProfile.hookline || !listener.draftProfile.aboutMe) {
        throw new AppError('Hookline and About Me are required to submit your profile.', 400);
      }

      // Capture snapshot of current public profile for accurate diff display in admin panel
      // Clear old previousProfile if it was from a previous approved/rejected cycle
      if (listener.profileStatus !== 'draft') {
        listener.previousProfile = null;
      }
      listener.previousProfile = listener.publicProfile || {};
      listener.profileStatus = 'pending';
      listener.profileSubmittedAt = new Date();
      listener.profileAdminNotes = '';
      await listener.save();

      return ApiResponse.success(res, {
        profileStatus: listener.profileStatus,
        profileSubmittedAt: listener.profileSubmittedAt,
      }, 'Profile submitted for approval');
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /listeners/:id/public-profile
   * Returns the approved public profile for a listener (user-facing).
   */
  static async getPublicProfile(req, res, next) {
    try {
      const listener = await Listener.findByUserId(req.params.id);
      if (!listener) {
        throw new AppError('Listener not found', 404);
      }

      return ApiResponse.success(res, {
        id: listener.userId?._id || listener.userId,
        displayName: listener.displayName,
        name: listener.userId?.name,
        username: listener.userId?.username,
        gender: listener.userId?.gender,
        avatarIndex: listener.userId?.avatarIndex,
        rating: listener.rating,
        totalSessions: listener.totalSessions,
        isOnline: listener.isOnline,
        isBusy: listener.isBusy,
        busySince: listener.busySince,
        verified: listener.verified,
        bestChoice: listener.bestChoice,
        introAudioUrl: listener.introAudioUrl,
        gradientColors: listener.gradientColors,
        audioEnabled: listener.audioEnabled,
        videoEnabled: listener.videoEnabled,
        chatEnabled: listener.chatEnabled,
        profileImage: listener.publicProfile?.profileImage || listener.profileImage,
        publicProfile: listener.publicProfile || {},
        createdAt: listener.createdAt,
      }, 'Public profile retrieved');
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /listener/upload-media
   * Generate presigned upload URLs for profile media (images/videos).
   */
  static async getMediaUploadUrls(req, res, next) {
    try {
      const { files } = req.body;
      // files should be array of { fileType, extension, category }
      // category: 'profile_image' | 'gallery_image' | 'gallery_video' | 'intro_video'
      if (!files || !Array.isArray(files) || files.length === 0) {
        throw new AppError('Files array is required', 400);
      }

      if (files.length > 10) {
        throw new AppError('Maximum 10 files at once', 400);
      }

      // ── Avatar-only policy: photos are never permitted for listeners ──
      const PHOTO_CATEGORIES = ['profile_image', 'cover_image', 'gallery_image', 'gallery_video'];
      if (files.some((f) => PHOTO_CATEGORIES.includes(f?.category))) {
        throw new AppError('Photos are not permitted for listeners. Only an avatar can be used as the profile picture.', 403);
      }

      const folderMap = {
        profile_image: 'listener_profiles',
        cover_image: 'listener_covers',
        gallery_image: 'listener_galleries',
        gallery_video: 'listener_videos',
        intro_video: 'listener_intros',
      };

      const uploadRequests = files.map((f) => ({
        fileType: f.fileType,
        extension: f.extension,
        folder: folderMap[f.category] || 'listener_galleries',
      }));

      const results = await generateMultipleUploadUrls(uploadRequests);

      // Map back with category info
      const uploads = results.map((r, i) => ({
        ...r,
        category: files[i].category,
      }));

      return ApiResponse.success(res, { uploads }, 'Upload URLs generated');
    } catch (err) {
      next(err);
    }
  }
  /**
   * PATCH /listener/settings
   * Update audio/video/chat enabled status.
   */
  static async updateSettings(req, res, next) {
    try {
      const { audioEnabled, videoEnabled, chatEnabled } = req.body;
      const listener = await Listener.findOne({ userId: req.user.id });
      if (!listener) {
        throw new AppError('Listener profile not found', 404);
      }

      if (audioEnabled !== undefined) listener.audioEnabled = audioEnabled;
      if (videoEnabled !== undefined) listener.videoEnabled = videoEnabled;
      if (chatEnabled !== undefined) listener.chatEnabled = chatEnabled;

      await listener.save();

      return ApiResponse.success(res, {
        audioEnabled: listener.audioEnabled,
        videoEnabled: listener.videoEnabled,
        chatEnabled: listener.chatEnabled,
      }, 'Settings updated');
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /listener/earnings-stats
   * Dashboard earnings reconciled DIRECTLY against the transaction ledger.
   * Earnings and session counts are derived from completed call_credit and
   * gift_receive transactions (joined with their Session docs), instead of
   * the accumulated counter fields — so the dashboard always matches the
   * visible transaction history.
   */
  static async getEarningsStats(req, res, next) {
    try {
      const userId = req.user.id;
      const Transaction = require('../models/transactionModel');
      const Session = require('../models/sessionModel');

      const credits = await Transaction.find({
        userId,
        type: { $in: ['call_credit', 'gift_receive'] },
        status: 'completed',
      }).select('type amount metadata description createdAt').lean();

      let ledgerTotal = 0;
      let giftEarnings = 0;
      const bySession = {}; // sessionId -> { amount }
      for (const t of credits) {
        const amt = t.amount || 0;
        if (t.type === 'gift_receive') {
          giftEarnings += amt;
        } else {
          ledgerTotal += amt;
          const sid = t.metadata?.sessionId ? t.metadata.sessionId.toString() : `txn_${t._id}`;
          if (!bySession[sid]) bySession[sid] = { amount: 0, sessionId: t.metadata?.sessionId || null };
          bySession[sid].amount += amt;
        }
      }

      // Resolve each credited session to its call type for accurate counts + breakdown
      const sessionIds = Object.values(bySession)
        .filter((s) => s.sessionId)
        .map((s) => s.sessionId.toString());
      const sessions = await Session.find({ _id: { $in: sessionIds } }).select('callType').lean();
      const typeOf = {};
      for (const s of sessions) typeOf[s._id.toString()] = s.callType;

      const counts = { audio: 0, video: 0, chat: 0, other: 0 };
      const breakdown = { audio: 0, video: 0, chat: 0, gifts: giftEarnings, other: 0 };
      for (const [sid, info] of Object.entries(bySession)) {
        const t = typeOf[sid];
        if (t === 'audio' || t === 'video' || t === 'chat') {
          counts[t] += 1;
          breakdown[t] += info.amount;
        } else {
          counts.other += 1;
          breakdown.other += info.amount;
        }
      }

      const round2 = (n) => Math.round(n * 100) / 100;
      const totalEarnings = round2(ledgerTotal + giftEarnings);

      const Listener = require('../models/listenerModel');
      const listener = await Listener.findOne({ userId }).select('earnings');
      const counterTotal = round2(listener?.earnings || 0);

      return ApiResponse.success(res, {
        totalEarnings,
        breakdown: {
          audio: round2(breakdown.audio),
          video: round2(breakdown.video),
          chat: round2(breakdown.chat),
          gifts: round2(breakdown.gifts),
          other: round2(breakdown.other),
        },
        calls: counts,
        audioCalls: counts.audio,
        videoCalls: counts.video,
        totalChats: counts.chat,
        ledgerTotal: totalEarnings,
        counterTotal,
        synced: Math.abs(counterTotal - totalEarnings) < 0.01,
      }, 'Earnings stats retrieved');
    } catch (err) {
      next(err);
    }
  }

  static async sseStatusStream(req, res, next) {
    try {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      const sseService = require('../services/sseService');
      sseService.addStatusClient(res);

      const keepAlive = setInterval(() => {
        res.write(': keep-alive\n\n');
      }, 30000);

      req.on('close', () => {
        clearInterval(keepAlive);
        sseService.removeStatusClient(res);
        res.end();
      });
    } catch (err) {
      console.error('SSE status stream error:', err);
      if (!res.headersSent) {
        next(err);
      }
    }
  }
}

module.exports = ListenerController;

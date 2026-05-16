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
        introVideoUrl: listener.introVideoUrl,
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
        galleryImages,
        galleryVideos,
        profileImage,
        gradientColors,
        displayName,
      } = req.body;

      // Build the draft profile object
      const draft = listener.draftProfile || {};

      if (hookline !== undefined) draft.hookline = hookline;
      if (aboutMe !== undefined) draft.aboutMe = aboutMe;
      if (expertiseTags !== undefined) draft.expertiseTags = expertiseTags;
      if (languages !== undefined) draft.languages = languages;
      if (galleryImages !== undefined) draft.galleryImages = galleryImages;
      if (galleryVideos !== undefined) draft.galleryVideos = galleryVideos;
      if (profileImage !== undefined) draft.profileImage = profileImage;
      if (req.body.coverImage !== undefined) draft.coverImage = req.body.coverImage;

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
        verified: listener.verified,
        bestChoice: listener.bestChoice,
        introVideoUrl: listener.introVideoUrl,
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
}

module.exports = ListenerController;

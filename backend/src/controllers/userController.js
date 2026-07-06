const User = require('../models/userModel');
const Listener = require('../models/listenerModel');
const MemberReport = require('../models/MemberReport');
const ApiResponse = require('../utils/apiResponse');
const AppError = require('../utils/appError');

class UserController {
  static async updateProfile(req, res, next) {
    try {
      const { name, username, gender, language, avatarIndex, interests } = req.body;
      const update = {};
      if (name !== undefined) update.name = name;
      if (gender !== undefined) update.gender = gender;
      if (language !== undefined) update.language = language;
      if (avatarIndex !== undefined) update.avatarIndex = avatarIndex;
      if (interests !== undefined) update.interests = interests;

      // Handle username update with uniqueness check
      if (username !== undefined) {
        const normalizedUsername = username.toLowerCase().replace(/\s/g, '');
        const existing = await User.findOne({ 
          username: normalizedUsername, 
          _id: { $ne: req.user.id } 
        });
        if (existing) {
          throw new AppError('Username already taken', 400);
        }
        update.username = normalizedUsername;
      }

      const user = await User.findByIdAndUpdate(req.user.id, update, { new: true });
      if (!user) throw new AppError('User not found', 404);

      // If user is a listener, sync the displayName if name was updated
      if (user.role === 'LISTENER' && name !== undefined) {
        await Listener.findOneAndUpdate(
          { userId: user._id },
          { displayName: name }
        );
      }

      return ApiResponse.success(res, {
        id: user._id,
        name: user.name,
        username: user.username,
        phone: user.phone,
        role: user.role,
        gender: user.gender,
        language: user.language,
        avatarIndex: user.avatarIndex,
        coins: user.coins,
        interests: user.interests,
      }, 'Profile updated');
    } catch (err) {
      next(err);
    }
  }

  static async updatePushToken(req, res, next) {
    try {
      const { pushToken } = req.body;

      // If pushToken is null, empty, or 'null'/'undefined' string, clear it
      const isClearRequest = !pushToken || pushToken === 'null' || pushToken === 'undefined' || String(pushToken).trim() === '';

      if (isClearRequest) {
        const user = await User.findByIdAndUpdate(
          req.user.id,
          { pushToken: null },
          { new: true }
        );
        if (!user) throw new AppError('User not found', 404);
        console.log(`[PushToken] Cleared push token for user ${req.user.id} (${user.name})`);
        return ApiResponse.success(res, { pushToken: null }, 'Push token cleared');
      }

      // Reject mock/invalid tokens
      const invalidTokens = ['expo-go-mock-token', 'mock-token', 'test-token'];
      if (invalidTokens.includes(pushToken) || pushToken.length < 10) {
        console.log(`[PushToken] Rejected invalid/mock token for user ${req.user.id}: ${pushToken}`);
        return ApiResponse.success(res, { pushToken: null }, 'Invalid push token rejected');
      }

      // Clear this push token from all other users to prevent multiple routing issues on shared devices
      await User.updateMany(
        { _id: { $ne: req.user.id }, pushToken },
        { $set: { pushToken: null } }
      );

      const user = await User.findByIdAndUpdate(
        req.user.id,
        { pushToken },
        { new: true }
      );
      if (!user) throw new AppError('User not found', 404);

      console.log(`[PushToken] Updated token for user ${req.user.id} (${user.name}): ${pushToken.substring(0, 30)}...`);
      return ApiResponse.success(res, { pushToken: user.pushToken }, 'Push token updated');
    } catch (err) {
      next(err);
    }
  }

  static async applyAsListener(req, res, next) {
    try {
      const { displayName, bio, audioEnabled, videoEnabled, introVideoUrl } = req.body;
      
      const existing = await Listener.findOne({ userId: req.user.id });
      if (existing) {
        if (existing.status === 'approved') {
          throw new AppError('You are already an approved listener', 409);
        }
        if (existing.status === 'pending') {
          throw new AppError('Your application is already pending review', 409);
        }
        existing.status = 'pending';
        existing.displayName = displayName || req.user.name;
        existing.bio = bio || '';
        existing.audioEnabled = audioEnabled !== false;
        existing.videoEnabled = videoEnabled === true;
        if (introVideoUrl) {
          existing.introVideoUrl = introVideoUrl;
        }
        await existing.save();
        return ApiResponse.success(res, existing, 'Application resubmitted');
      }

      if (!introVideoUrl) {
        throw new AppError('Introductory video is required to become a listener', 400);
      }

      const listener = await Listener.create({
        userId: req.user.id,
        displayName: displayName || req.user.name,
        bio: bio || '',
        audioEnabled: audioEnabled !== false,
        videoEnabled: videoEnabled === true,
        introVideoUrl,
        status: 'pending',
      });

      return ApiResponse.created(res, listener, 'Listener application submitted');
    } catch (err) {
      next(err);
    }
  }

  static async getUploadUrl(req, res, next) {
    try {
      const { fileType, extension } = req.body;
      if (!fileType || !extension) {
        throw new AppError('File type and extension are required', 400);
      }
      const { generateUploadUrl } = require('../utils/s3');
      const { uploadUrl, fileUrl } = await generateUploadUrl(fileType, extension);
      
      return ApiResponse.success(res, { uploadUrl, fileUrl }, 'Upload URL generated');
    } catch (err) {
      next(err);
    }
  }

  static async toggleFavourite(req, res, next) {
    try {
      const { listenerId } = req.body;
      const user = await User.findById(req.user.id);
      if (!user) throw new AppError('User not found', 404);

      const idx = user.favouriteListeners.indexOf(listenerId);
      if (idx === -1) {
        user.favouriteListeners.push(listenerId);
      } else {
        user.favouriteListeners.splice(idx, 1);
      }
      await user.save();

      return ApiResponse.success(res, {
        favouriteListeners: user.favouriteListeners,
        isFavourite: idx === -1,
      }, idx === -1 ? 'Added to favourites' : 'Removed from favourites');
    } catch (err) {
      next(err);
    }
  }

  static async getFavourites(req, res, next) {
    try {
      const user = await User.findById(req.user.id).populate({
        path: 'favouriteListeners',
        select: 'name username avatarIndex gender',
      });
      if (!user) throw new AppError('User not found', 404);

      return ApiResponse.success(res, user.favouriteListeners, 'Favourites retrieved');
    } catch (err) {
      next(err);
    }
  }

  // ─── Report User / Listener ─────────────────────────────────
  static async submitReport(req, res, next) {
    try {
      const { reportedUserId, category, message, reportType, sessionId } = req.body;
      if (!message || !message.trim()) {
        throw new AppError('Report message is required', 400);
      }

      const reportData = {
        reporter: req.user.id,
        reporterRole: req.user.role === 'LISTENER' ? 'listener' : 'user',
        message: message.trim(),
        category: category || 'other',
        reportType: reportType || 'general',
      };

      if (reportedUserId) {
        reportData.reportedUser = reportedUserId;
      }
      if (sessionId) {
        reportData.sessionId = sessionId;
      }

      const report = await MemberReport.create(reportData);

      return ApiResponse.created(res, report, 'Report submitted successfully');
    } catch (err) {
      next(err);
    }
  }

  // ─── Block / Unblock User ──────────────────────────────────
  static async blockUser(req, res, next) {
    try {
      const { targetUserId } = req.body;
      if (!targetUserId) {
        throw new AppError('Target user ID is required', 400);
      }

      if (targetUserId === req.user.id) {
        throw new AppError('You cannot block yourself', 400);
      }

      const user = await User.findById(req.user.id);
      if (!user) throw new AppError('User not found', 404);

      // Check if already blocked
      if (user.blockedUsers.includes(targetUserId)) {
        return ApiResponse.success(res, { blockedUsers: user.blockedUsers }, 'User is already blocked');
      }

      user.blockedUsers.push(targetUserId);
      await user.save();

      return ApiResponse.success(res, { blockedUsers: user.blockedUsers }, 'User blocked successfully');
    } catch (err) {
      next(err);
    }
  }

  static async unblockUser(req, res, next) {
    try {
      const { targetUserId } = req.body;
      if (!targetUserId) {
        throw new AppError('Target user ID is required', 400);
      }

      const user = await User.findById(req.user.id);
      if (!user) throw new AppError('User not found', 404);

      const idx = user.blockedUsers.indexOf(targetUserId);
      if (idx === -1) {
        return ApiResponse.success(res, { blockedUsers: user.blockedUsers }, 'User is not blocked');
      }

      user.blockedUsers.splice(idx, 1);
      await user.save();

      return ApiResponse.success(res, { blockedUsers: user.blockedUsers }, 'User unblocked successfully');
    } catch (err) {
      next(err);
    }
  }

  static async getBlockedUsers(req, res, next) {
    try {
      const user = await User.findById(req.user.id).populate({
        path: 'blockedUsers',
        select: 'name username avatarIndex gender',
      });
      if (!user) throw new AppError('User not found', 404);

      return ApiResponse.success(res, user.blockedUsers, 'Blocked users retrieved');
    } catch (err) {
      next(err);
    }
  }

  // ─── Delete Account (Self) ─────────────────────────────────
  static async deleteAccount(req, res, next) {
    try {
      const { reason } = req.body;

      const user = await User.findById(req.user.id);
      if (!user) throw new AppError('User not found', 404);

      // Soft delete — anonymize data
      user.isDeleted = true;
      user.deletedAt = new Date();
      user.deletionReason = reason || '';
      user.pushToken = null;
      user.isBanned = false;
      await user.save();

      // If user is a listener, set offline and deactivate
      const listener = await Listener.findOne({ userId: user._id });
      if (listener) {
        listener.isOnline = false;
        listener.isBusy = false;
        await listener.save();
      }

      // Log activity
      const ActivityLog = require('../models/ActivityLog');
      await ActivityLog.create({
        user: user.name,
        action: `User ${user.name} (@${user.username}) deleted their account. Reason: ${reason || 'Not specified'}`,
        type: 'user',
        icon: 'person-remove',
        color: '#EF4444',
      });

      return ApiResponse.success(res, null, 'Account deleted successfully');
    } catch (err) {
      next(err);
    }
  }

  static async switchRole(req, res, next) {
    try {
      const user = await User.findById(req.user.id);
      if (!user) throw new AppError('User not found', 404);

      if (user.role === 'LISTENER') {
        user.role = 'USER';
        await user.save();

        // Make listener offline
        await Listener.findOneAndUpdate(
          { userId: user._id },
          { isOnline: false, isBusy: false }
        );

        return ApiResponse.success(res, {
          id: user._id,
          name: user.name,
          username: user.username,
          phone: user.phone,
          role: user.role,
          gender: user.gender,
          language: user.language,
          avatarIndex: user.avatarIndex,
          coins: user.coins,
          interests: user.interests,
        }, 'Role switched to USER successfully');
      } else if (user.role === 'USER') {
        const listener = await Listener.findOne({ userId: user._id });
        if (!listener || listener.status !== 'approved') {
          throw new AppError('You must be an approved listener to switch to listener role', 400);
        }

        user.role = 'LISTENER';
        await user.save();

        return ApiResponse.success(res, {
          id: user._id,
          name: user.name,
          username: user.username,
          phone: user.phone,
          role: user.role,
          gender: user.gender,
          language: user.language,
          avatarIndex: user.avatarIndex,
          coins: user.coins,
          interests: user.interests,
        }, 'Role switched to LISTENER successfully');
      } else {
        throw new AppError('Only USER and LISTENER roles can switch', 400);
      }
    } catch (err) {
      next(err);
    }
  }
}

module.exports = UserController;

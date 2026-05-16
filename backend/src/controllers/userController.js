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
      if (!pushToken) throw new AppError('Push token is required', 400);

      const user = await User.findByIdAndUpdate(
        req.user.id,
        { pushToken },
        { new: true }
      );
      if (!user) throw new AppError('User not found', 404);

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

  static async submitReport(req, res, next) {
    try {
      const { message } = req.body;
      if (!message || !message.trim()) {
        throw new AppError('Report message is required', 400);
      }

      const report = await MemberReport.create({
        reporter: req.user.id,
        reporterRole: req.user.role === 'LISTENER' ? 'listener' : 'user',
        message: message.trim(),
      });

      return ApiResponse.created(res, report, 'Report submitted');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = UserController;

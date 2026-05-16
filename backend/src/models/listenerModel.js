const mongoose = require('mongoose');

const publicProfileSchema = new mongoose.Schema(
  {
    hookline: {
      type: String,
      default: '',
      maxlength: 150,
    },
    aboutMe: {
      type: String,
      default: '',
      maxlength: 2000,
    },
    expertiseTags: {
      type: [String],
      default: [],
    },
    languages: {
      type: [String],
      default: ['English'],
    },
    galleryImages: {
      type: [String],
      default: [],
    },
    galleryVideos: {
      type: [String],
      default: [],
    },
    profileImage: {
      type: String,
      default: null,
    },
    coverImage: {
      type: String,
      default: null,
    },
  },
  { _id: false }
);

const listenerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    displayName: {
      type: String,
      default: '',
    },
    bio: {
      type: String,
      default: '',
      maxlength: 500,
    },
    introVideoUrl: {
      type: String,
      default: null,
    },
    profileImage: {
      type: String,
      default: null,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalSessions: {
      type: Number,
      default: 0,
      min: 0,
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    isBusy: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    verified: {
      type: Boolean,
      default: false,
    },
    bestChoice: {
      type: Boolean,
      default: false,
    },
    earnings: {
      type: Number,
      default: 0,
      min: 0,
    },
    audioEnabled: {
      type: Boolean,
      default: true,
    },
    videoEnabled: {
      type: Boolean,
      default: false,
    },
    chatEnabled: {
      type: Boolean,
      default: true,
    },
    audioCalls: {
      type: Number,
      default: 0,
    },
    videoCalls: {
      type: Number,
      default: 0,
    },
    todayEarnings: {
      type: Number,
      default: 0,
    },
    todayAudioCalls: {
      type: Number,
      default: 0,
    },
    todayVideoCalls: {
      type: Number,
      default: 0,
    },
    lastEarningsReset: {
      type: Date,
      default: Date.now,
    },
    gradientColors: {
      type: [String],
      default: ['#3B82F6', '#8B5CF6'],
    },

    // ─── Public Profile ───────────────────────────────────────
    publicProfile: {
      type: publicProfileSchema,
      default: () => ({}),
    },

    // Draft profile: stores changes awaiting admin approval
    draftProfile: {
      type: publicProfileSchema,
      default: null,
    },

    // Profile approval status
    profileStatus: {
      type: String,
      enum: ['none', 'draft', 'pending', 'approved', 'rejected'],
      default: 'none',
    },

    // Admin notes for rejection reason
    profileAdminNotes: {
      type: String,
      default: '',
    },

    // Timestamp when profile was submitted for approval
    profileSubmittedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);


listenerSchema.index({ isOnline: 1 });
listenerSchema.index({ rating: -1 });
listenerSchema.index({ status: 1 });
listenerSchema.index({ bestChoice: 1 });
listenerSchema.index({ profileStatus: 1 });

listenerSchema.statics.findByUserId = function (userId) {
  return this.findOne({ userId }).populate('userId', 'name username phone role gender avatarIndex isBanned');
};

listenerSchema.statics.findAllWithUser = function () {
  return this.find()
    .populate('userId', 'name username phone role gender avatarIndex isBanned')
    .sort({ rating: -1 });
};

listenerSchema.statics.setOnlineStatus = async function (userId, isOnline) {
  const update = { isOnline };
  if (!isOnline) update.isBusy = false;
  return this.findOneAndUpdate({ userId }, update, { new: true });
};

listenerSchema.statics.updateRating = async function (userId, newRating) {
  const listener = await this.findOne({ userId });
  if (!listener) return null;

  const newAvg = (listener.rating * listener.totalSessions + newRating) / (listener.totalSessions || 1);

  listener.rating = Math.round(newAvg * 10) / 10;
  await listener.save();

  return listener;
};

listenerSchema.statics.getStats = async function (userId) {
  const listener = await this.findOne({ userId }).lean();
  if (!listener) return null;

  
  const Session = mongoose.model('Session');
  const lastSession = await Session.findOne({ listenerId: userId })
    .sort({ startTime: -1 })
    .lean();

  const lastActivity = lastSession ? lastSession.startTime : listener.createdAt;
  const secondsSinceLastSession = (Date.now() - new Date(lastActivity).getTime()) / 1000;

  return {
    rating: listener.rating,
    totalSessions: listener.totalSessions,
    secondsSinceLastSession,
  };
};

listenerSchema.statics.getBestChoice = function (limit = 10) {
  return this.find({ bestChoice: true, status: 'approved' })
    .populate('userId', 'name username phone role gender avatarIndex')
    .sort({ rating: -1 })
    .limit(limit);
};

listenerSchema.statics.getApproved = function () {
  return this.find({ status: 'approved' })
    .populate('userId', 'name username phone role gender avatarIndex')
    .sort({ rating: -1 });
};

const Listener = mongoose.model('Listener', listenerSchema);

module.exports = Listener;

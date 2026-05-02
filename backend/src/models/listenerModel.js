const mongoose = require('mongoose');

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
  },
  {
    timestamps: true,
  }
);


listenerSchema.index({ isOnline: 1 });
listenerSchema.index({ rating: -1 });
listenerSchema.index({ status: 1 });
listenerSchema.index({ bestChoice: 1 });

listenerSchema.statics.findByUserId = function (userId) {
  return this.findOne({ userId }).populate('userId', 'name username phone role gender avatarIndex isBanned');
};

listenerSchema.statics.findAllWithUser = function () {
  return this.find()
    .populate('userId', 'name username phone role gender avatarIndex isBanned')
    .sort({ rating: -1 });
};

listenerSchema.statics.setOnlineStatus = async function (userId, isOnline) {
  return this.findOneAndUpdate(
    { userId },
    { isOnline },
    { new: true }
  );
};

listenerSchema.statics.updateRating = async function (userId, newRating) {
  const listener = await this.findOne({ userId });
  if (!listener) return null;

  const newTotal = listener.totalSessions + 1;
  const newAvg = (listener.rating * listener.totalSessions + newRating) / newTotal;

  listener.rating = Math.round(newAvg * 10) / 10;
  listener.totalSessions = newTotal;
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

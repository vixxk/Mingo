const mongoose = require('mongoose');

const listenerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
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
  },
  {
    timestamps: true,
  }
);


listenerSchema.index({ isOnline: 1 });
listenerSchema.index({ rating: -1 });

listenerSchema.statics.findByUserId = function (userId) {
  return this.findOne({ userId }).populate('userId', 'name username email role');
};

listenerSchema.statics.findAllWithUser = function () {
  return this.find()
    .populate('userId', 'name username email role')
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

  listener.rating = newAvg;
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

const Listener = mongoose.model('Listener', listenerSchema);

module.exports = Listener;

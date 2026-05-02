const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    listenerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    roomId: {
      type: String,
      required: true,
      unique: true,
    },
    callType: {
      type: String,
      enum: ['audio', 'video'],
      default: 'audio',
    },
    startTime: {
      type: Date,
      default: Date.now,
    },
    endTime: {
      type: Date,
      default: null,
    },
    duration: {
      type: Number,
      default: 0,
    },
    coinsDeducted: {
      type: Number,
      default: 0,
    },
    listenerEarnings: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'cancelled', 'missed'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);


sessionSchema.index({ userId: 1 });
sessionSchema.index({ listenerId: 1 });
sessionSchema.index({ status: 1 });
sessionSchema.index({ startTime: -1 });

sessionSchema.statics.endSession = async function (sessionId) {
  const session = await this.findById(sessionId);
  if (!session || session.status !== 'active') return session;

  const endTime = new Date();
  const durationMs = endTime - session.startTime;
  const durationMinutes = Math.ceil(durationMs / 60000);

  const coinsPerMinute = session.callType === 'video' ? 6 : 1;
  const coinsDeducted = durationMinutes * coinsPerMinute;
  const listenerEarnings = Math.floor(coinsDeducted * 0.6);

  return this.findOneAndUpdate(
    { _id: sessionId, status: 'active' },
    {
      endTime,
      status: 'completed',
      duration: durationMinutes,
      coinsDeducted,
      listenerEarnings,
    },
    { new: true }
  );
};

sessionSchema.statics.findActiveByUserId = function (userId) {
  return this.findOne({ userId, status: 'active' }).sort({ startTime: -1 });
};

sessionSchema.statics.findByUserId = function (userId, limit = 20, offset = 0) {
  return this.find({ userId })
    .populate('listenerId', 'name username avatarIndex gender')
    .sort({ startTime: -1 })
    .skip(offset)
    .limit(limit);
};

sessionSchema.statics.findByListenerId = function (listenerId, limit = 20, offset = 0) {
  return this.find({ listenerId })
    .populate('userId', 'name username avatarIndex gender')
    .sort({ startTime: -1 })
    .skip(offset)
    .limit(limit);
};

const Session = mongoose.model('Session', sessionSchema);

module.exports = Session;

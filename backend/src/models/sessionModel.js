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
    lastDeductionTime: {
      type: Date,
      default: null,
    },
    rating: {
      type: Number,
      default: null,
      min: 1,
      max: 5,
    },
    feedback: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'cancelled', 'missed'],
      default: 'active',
    },
    zegoCost: {
      type: Number,
      default: 0,
    },
    infraCost: {
      type: Number,
      default: 0,
    },
    platformProfit: {
      type: Number,
      default: 0,
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

  const isVideo = session.callType === 'video';
  
  // Section A - Rates per minute
  const coinsPerMinute = isVideo ? 30 : 10; // 30 coins = ₹15, 10 coins = ₹5
  const payoutRate = isVideo ? 4.00 : 1.50;
  const zegoRate = isVideo ? 0.20 : 0.06;
  const infraRate = isVideo ? 0.15 : 0.09;

  const coinsDeducted = durationMinutes * coinsPerMinute;
  const listenerEarnings = durationMinutes * payoutRate;
  const zegoCost = durationMinutes * zegoRate;
  const infraCost = durationMinutes * infraRate;
  
  // Selling Price (in ₹)
  const sellingPrice = isVideo ? 15.00 : 5.00;
  const totalRevenue = durationMinutes * sellingPrice;
  const platformProfit = totalRevenue - (listenerEarnings + zegoCost + infraCost);

  return this.findOneAndUpdate(
    { _id: sessionId, status: 'active' },
    {
      endTime,
      status: 'completed',
      duration: durationMinutes,
      coinsDeducted,
      listenerEarnings,
      zegoCost,
      infraCost,
      platformProfit,
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

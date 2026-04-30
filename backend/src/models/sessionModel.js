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
    startTime: {
      type: Date,
      default: Date.now,
    },
    endTime: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'cancelled'],
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

sessionSchema.statics.endSession = async function (sessionId) {
  return this.findOneAndUpdate(
    { _id: sessionId, status: 'active' },
    { endTime: new Date(), status: 'completed' },
    { new: true }
  );
};

sessionSchema.statics.findActiveByUserId = function (userId) {
  return this.findOne({ userId, status: 'active' }).sort({ startTime: -1 });
};

sessionSchema.statics.findByUserId = function (userId, limit = 20, offset = 0) {
  return this.find({ userId })
    .populate('listenerId', 'name username')
    .sort({ startTime: -1 })
    .skip(offset)
    .limit(limit);
};

sessionSchema.statics.findByListenerId = function (listenerId, limit = 20, offset = 0) {
  return this.find({ listenerId })
    .populate('userId', 'name username')
    .sort({ startTime: -1 })
    .skip(offset)
    .limit(limit);
};

const Session = mongoose.model('Session', sessionSchema);

module.exports = Session;

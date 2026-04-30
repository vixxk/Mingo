const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      required: true,
    },
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
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    feedback: {
      type: String,
      maxlength: 1000,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);


ratingSchema.index({ sessionId: 1 });
ratingSchema.index({ listenerId: 1 });

ratingSchema.statics.findBySessionId = function (sessionId) {
  return this.findOne({ sessionId });
};

ratingSchema.statics.findByListenerId = function (listenerId, limit = 20, offset = 0) {
  return this.find({ listenerId })
    .populate('userId', 'name')
    .sort({ createdAt: -1 })
    .skip(offset)
    .limit(limit);
};

const Rating = mongoose.model('Rating', ratingSchema);

module.exports = Rating;

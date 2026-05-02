const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema(
  {
    user: {
      type: String,
      required: true,
    },
    action: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['call', 'admin', 'user', 'listener', 'system'],
      default: 'system',
    },
    icon: {
      type: String,
      default: 'information-circle',
    },
    color: {
      type: String,
      default: '#3B82F6',
    },
  },
  {
    timestamps: true,
  }
);

activityLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);

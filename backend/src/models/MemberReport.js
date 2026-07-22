const mongoose = require('mongoose');

const memberReportSchema = new mongoose.Schema(
  {
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reporterRole: {
      type: String,
      enum: ['user', 'listener'],
      required: true,
    },
    reportedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reportType: {
      type: String,
      enum: ['user_report', 'listener_report', 'general'],
      default: 'general',
    },
    category: {
      type: String,
      enum: ['spam', 'harassment', 'inappropriate_content', 'hate_speech', 'fraud', 'other'],
      default: 'other',
    },
    message: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      default: null,
    },
    status: {
      type: String,
      enum: ['pending', 'resolved', 'dismissed'],
      default: 'pending',
    },
    adminNotes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

memberReportSchema.index({ status: 1 });
memberReportSchema.index({ reportType: 1 });
memberReportSchema.index({ createdAt: -1 });

module.exports = mongoose.model('MemberReport', memberReportSchema);

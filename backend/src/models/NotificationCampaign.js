const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    body: {
      type: String,
      required: true,
    },
    target: {
      type: String,
      required: true, // all, users, listeners, specific
    },
    method: {
      type: String,
      required: true, // push, platform, both
    },
    sentToCount: {
      type: Number,
      default: 0,
    },
    // Alias used by the admin history UI. This is the number of valid
    // audience accounts selected for the campaign, not just accounts with a
    // currently registered push token.
    sentCount: {
      type: Number,
      default: 0,
    },
    openedCount: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: String,
      default: 'Admin',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('NotificationCampaign', campaignSchema);

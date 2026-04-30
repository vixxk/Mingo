const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  user: {
    type: String,
    required: true
  },
  action: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['user', 'listener', 'admin', 'system', 'call', 'payment'],
    default: 'system'
  },
  details: {
    type: mongoose.Schema.Types.Mixed
  },
  icon: {
    type: String,
    default: 'information-circle'
  },
  color: {
    type: String,
    default: '#3B82F6'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ActivityLog', activityLogSchema);

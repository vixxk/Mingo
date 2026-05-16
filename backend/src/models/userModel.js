const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 50,
    },

    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },

    role: {
      type: String,
      enum: ['USER', 'LISTENER', 'ADMIN', 'SUPPORT_ADMIN', 'FINANCE_ADMIN', 'MODERATOR_ADMIN'],
      default: 'USER',
    },

    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other'],
      default: null,
    },
    language: {
      type: String,
      default: 'English',
    },
    avatarIndex: {
      type: Number,
      default: 0,
    },
    coins: {
      type: Number,
      default: 50,
      min: 0,
    },
    interests: [{
      type: String,
    }],
    isBanned: {
      type: Boolean,
      default: false,
    },
    isFirstSignup: {
      type: Boolean,
      default: true,
    },
    signupTimestamp: {
      type: Date,
      default: null,
    },
    favouriteListeners: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    pushToken: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);


userSchema.index({ role: 1 });
userSchema.index({ isBanned: 1 });

userSchema.statics.findByPhone = function (phone) {
  return this.findOne({ phone });
};

userSchema.statics.exists = async function (username, phone) {
  const query = [];
  if (username) query.push({ username });
  if (phone) query.push({ phone });
  
  if (query.length === 0) return false;

  const user = await this.findOne({
    $or: query,
  }).lean();
  return !!user;
};

const User = mongoose.model('User', userSchema);

module.exports = User;

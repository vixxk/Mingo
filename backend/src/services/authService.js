
const jwt = require('jsonwebtoken');
const axios = require('axios');
const config = require('../config/env');
const { redis } = require('../config/redis');
const User = require('../models/userModel');
const Listener = require('../models/listenerModel');
const AppError = require('../utils/appError');

const getTenDigitPhone = (phone) => {
  const digits = phone.replace(/\D/g, '');
  return digits.length > 10 ? digits.slice(-10) : digits;
};


class AuthService {
    static async sendOtp(phone) {
    if (!phone) {
      throw new AppError('Phone number is required', 400);
    }
    
    const isTestAdmin = phone === config.test.adminPhone;
    const isTestListener = phone === config.test.listenerPhone;
    
    if (isTestAdmin || isTestListener) {
      const mockOtp = isTestAdmin ? (config.test.adminOtp || '0000') : (config.test.listenerOtp || '000000');
      const redisKey = `otp:${phone}`;
      await redis.set(redisKey, mockOtp, 'EX', 300);
      console.log(`[Test Mode] Generated mock OTP ${mockOtp} for phone: ${phone}`);
      return { message: 'OTP sent successfully (Test Mock Mode)' };
    }

    // Rate limiting: maximum 5 OTPs per hour per phone number
    const now = Date.now();
    const limitKey = `otp_limit:${phone}`;
    const oneHourAgo = now - 3600 * 1000;

    // Clean up requests older than 1 hour
    await redis.zremrangebyscore(limitKey, 0, oneHourAgo);

    // Count the requests in the last hour
    const otpCount = await redis.zcard(limitKey);

    if (otpCount >= 5) {
      throw new AppError('Too many OTP requests. You can only request up to 5 OTPs per hour.', 429);
    }

    try {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const redisKey = `otp:${phone}`;
      
      // Store in Redis with a 5-minute (300 seconds) expiration
      await redis.set(redisKey, otp, 'EX', 300);

      const cleanedPhone = getTenDigitPhone(phone);
      
      console.log(`Sending OTP ${otp} via Fast2SMS to: ${cleanedPhone}`);
      const response = await axios.post('https://www.fast2sms.com/dev/otp/send', {
        mobile: cleanedPhone,
        otp_id: config.fast2sms.otpId,
        otp: otp
      }, {
        headers: {
          'authorization': config.fast2sms.apiKey,
          'accept': 'application/json',
          'content-type': 'application/json'
        }
      });

      if (!response.data || response.data.return !== true) {
        const errorMsg = response.data?.message || 'Fast2SMS did not return success';
        throw new Error(errorMsg);
      }

      // Record successful OTP request in rate limit set
      await redis.zadd(limitKey, now, now);
      await redis.expire(limitKey, 3600);

      return { message: 'OTP sent successfully' };
    } catch (error) {
      console.error('Fast2SMS Send OTP Error:', error.response?.data || error.message);
      throw new AppError('Failed to send OTP SMS', 500);
    }
  }

    static async loginSendOtp(phone) {
    if (!phone) {
      throw new AppError('Phone number is required', 400);
    }

    const isTestAdmin = phone === config.test.adminPhone;
    const isTestListener = phone === config.test.listenerPhone;

    let user = await User.findByPhone(phone);
    if (!user && !isTestAdmin && !isTestListener) {
      throw new AppError('Account not found. Please sign up first.', 404);
    }

    if (user && user.isBanned) {
      throw new AppError('Your account has been suspended. Contact support.', 403);
    }

    if (user && user.isDeleted) {
      throw new AppError('This account has been deleted. Please sign up again if you wish to use Mingo.', 410);
    }

    return await AuthService.sendOtp(phone);
  }

    static async signup({ name, username, phone, otp, gender, language, avatarIndex }) {
    if (!phone || !otp) {
      throw new AppError('Phone number and OTP are required', 400);
    }

    const isTestAdmin = phone === config.test.adminPhone && otp === config.test.adminOtp;
    const isTestListener = phone === config.test.listenerPhone && otp === config.test.listenerOtp;

    if (!isTestAdmin && !isTestListener) {
      try {
        const redisKey = `otp:${phone}`;
        const storedOtp = await redis.get(redisKey);

        if (!storedOtp || storedOtp !== otp) {
          throw new AppError('Invalid or expired OTP', 400);
        }

        await redis.del(redisKey);
      } catch (error) {
        if (error instanceof AppError) throw error;
        console.error('OTP Verification Error:', error.message);
        throw new AppError('Invalid or expired OTP', 400);
      }
    }

    
    const exists = await User.exists(username, phone);
    if (exists) {
      throw new AppError('Username or phone already exists', 409);
    }

    
    const user = await User.create({
      name,
      username,
      phone,
      gender,
      language,
      avatarIndex,
      role: isTestAdmin ? 'ADMIN' : (isTestListener ? 'LISTENER' : 'USER'),
      isVerified: true,
      isFirstSignup: true,
      signupTimestamp: new Date(),
      coins: 50,
    });

    if (isTestListener) {
      await Listener.create({
        userId: user._id,
        displayName: name,
        status: 'approved',
        audioEnabled: true,
        videoEnabled: true,
      });
    }

    
    const token = AuthService._generateToken(user);

    return {
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        phone: user.phone,
        role: user.role,
        isVerified: user.isVerified,
        coins: user.coins,
        gender: user.gender,
        language: user.language,
        avatarIndex: user.avatarIndex,
        isFirstSignup: user.isFirstSignup,
        signupTimestamp: user.signupTimestamp,
        createdAt: user.createdAt,
      },
      token,
    };
  }

    static async login({ phone, otp }) {
    if (!phone || !otp) {
      throw new AppError('Phone number and OTP are required', 400);
    }

    const isTestAdmin = phone === config.test.adminPhone && otp === config.test.adminOtp;
    const isTestListener = phone === config.test.listenerPhone && otp === config.test.listenerOtp;

    if (!isTestAdmin && !isTestListener) {
      try {
        const redisKey = `otp:${phone}`;
        const storedOtp = await redis.get(redisKey);

        if (!storedOtp || storedOtp !== otp) {
          throw new AppError('Invalid or expired OTP', 400);
        }

        await redis.del(redisKey);
      } catch (error) {
        if (error instanceof AppError) throw error;
        console.error('OTP Verification Error:', error.message);
        throw new AppError('Invalid or expired OTP', 400);
      }
    }

    let user = await User.findByPhone(phone);
    if (!user) {
      if (isTestAdmin || isTestListener) {
        user = await User.create({
          name: isTestAdmin ? 'Test Admin' : 'Test Listener',
          username: isTestAdmin ? 'testadmin' : 'testlistener',
          phone,
          role: isTestAdmin ? 'ADMIN' : 'LISTENER',
          isVerified: true,
          isFirstSignup: false,
        });

        if (isTestListener) {
          await Listener.create({
            userId: user._id,
            displayName: 'Test Listener',
            status: 'approved',
            audioEnabled: true,
            videoEnabled: true,
          });
        }
      } else {
        throw new AppError('User not found. Please sign up.', 404);
      }
    }

    if (user.isBanned) {
      throw new AppError('Your account has been suspended. Contact support.', 403);
    }

    if (user.isDeleted) {
      throw new AppError('This account has been deleted. Please sign up again if you wish to use Mingo.', 410);
    }

    const token = AuthService._generateToken(user);

    const listenerData = await Listener.findOne({ userId: user._id });

    return {
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        phone: user.phone,
        role: user.role,
        coins: user.coins,
        gender: user.gender,
        language: user.language,
        avatarIndex: user.avatarIndex,
        isFirstSignup: user.isFirstSignup,
        signupTimestamp: user.signupTimestamp,
        createdAt: user.createdAt,
        listener: listenerData ? {
          status: listenerData.status,
          isOnline: listenerData.isOnline,
          rating: listenerData.rating,
          totalSessions: listenerData.totalSessions,
          audioEnabled: listenerData.audioEnabled,
          videoEnabled: listenerData.videoEnabled,
        } : undefined,
      },
      token,
    };
  }

    static async getProfile(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const listenerProfile = await Listener.findOne({ userId });

    return {
      id: user._id,
      name: user.name,
      username: user.username,
      phone: user.phone,
      role: user.role,
      gender: user.gender,
      language: user.language,
      avatarIndex: user.avatarIndex,
      coins: user.coins,
      interests: user.interests,
      isFirstSignup: user.isFirstSignup,
      signupTimestamp: user.signupTimestamp,
      favouriteListeners: user.favouriteListeners,
      createdAt: user.createdAt,
      listener: listenerProfile
        ? {
            rating: listenerProfile.rating,
            totalSessions: listenerProfile.totalSessions,
            isOnline: listenerProfile.isOnline,
            status: listenerProfile.status,
            verified: listenerProfile.verified,
            bestChoice: listenerProfile.bestChoice,
            earnings: listenerProfile.earnings,
            audioEnabled: listenerProfile.audioEnabled,
            videoEnabled: listenerProfile.videoEnabled,
            todayEarnings: listenerProfile.todayEarnings,
            todayAudioCalls: listenerProfile.todayAudioCalls,
            todayVideoCalls: listenerProfile.todayVideoCalls,
          }
        : undefined,
    };
  }

    static _generateToken(user) {
    return jwt.sign(
      { userId: user._id, role: user.role },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );
  }
}

module.exports = AuthService;

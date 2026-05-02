
const jwt = require('jsonwebtoken');
const twilio = require('twilio');
const config = require('../config/env');
const { redis } = require('../config/redis');
const User = require('../models/userModel');
const Listener = require('../models/listenerModel');
const AppError = require('../utils/appError');


class AuthService {
    static async sendOtp(phone) {
    if (!phone) {
      throw new AppError('Phone number is required', 400);
    }
    
    const isTestAdmin = phone === config.test.adminPhone;
    const isTestListener = phone === config.test.listenerPhone;
    
    if (isTestAdmin || isTestListener) {
      return { message: 'OTP sent successfully (Test Account)' };
    }

    try {
      const client = twilio(config.twilio.accountSid, config.twilio.authToken);
      
      
      const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;

      await client.verify.v2.services(config.twilio.serviceSid)
        .verifications
        .create({ to: formattedPhone, channel: 'sms' });
      
      return { message: 'OTP sent successfully' };
    } catch (error) {
      console.error('Twilio Verify Send Error:', error.message);
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

    return await AuthService.sendOtp(phone);
  }

    static async signup({ name, username, phone, otp }) {
    if (!phone || !otp) {
      throw new AppError('Phone number and OTP are required', 400);
    }

    const isTestAdmin = phone === config.test.adminPhone && otp === config.test.adminOtp;
    const isTestListener = phone === config.test.listenerPhone && otp === config.test.listenerOtp;

    if (!isTestAdmin && !isTestListener) {
      try {
        const client = twilio(config.twilio.accountSid, config.twilio.authToken);
        const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
        
        const verificationCheck = await client.verify.v2.services(config.twilio.serviceSid)
          .verificationChecks
          .create({ to: formattedPhone, code: otp });

        if (verificationCheck.status !== 'approved') {
          throw new AppError('Invalid or expired OTP', 400);
        }
      } catch (error) {
        if (error instanceof AppError) throw error;
        console.error('Twilio Verify Check Error:', error.message);
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
      role: isTestAdmin ? 'ADMIN' : (isTestListener ? 'LISTENER' : 'USER'),
      isVerified: true,
      isFirstSignup: true,
      signupTimestamp: new Date(),
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
        const client = twilio(config.twilio.accountSid, config.twilio.authToken);
        const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
        
        const verificationCheck = await client.verify.v2.services(config.twilio.serviceSid)
          .verificationChecks
          .create({ to: formattedPhone, code: otp });

        if (verificationCheck.status !== 'approved') {
          throw new AppError('Invalid or expired OTP', 400);
        }
      } catch (error) {
        if (error instanceof AppError) throw error;
        console.error('Twilio Verify Check Error:', error.message);
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

    const token = AuthService._generateToken(user);

    let listenerData = null;
    if (user.role === 'LISTENER') {
      listenerData = await Listener.findOne({ userId: user._id });
    }

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

    let listenerProfile = null;
    if (user.role === 'LISTENER') {
      listenerProfile = await Listener.findOne({ userId });
    }

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

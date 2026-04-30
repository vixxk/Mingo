
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
    });



    
    const token = AuthService._generateToken(user);

    return {
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        phone: user.phone,
        role: user.role,
        isVerified: user.isVerified,
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
        });
      } else {
        throw new AppError('User not found. Please sign up.', 404);
      }
    }

    const token = AuthService._generateToken(user);

    return {
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        phone: user.phone,
        role: user.role,
        createdAt: user.createdAt,
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
      createdAt: user.createdAt,
      listener: listenerProfile
        ? {
            rating: listenerProfile.rating,
            totalSessions: listenerProfile.totalSessions,
            isOnline: listenerProfile.isOnline,
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

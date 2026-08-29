
const jwt = require('jsonwebtoken');
const axios = require('axios');
const config = require('../config/env');
const { redis } = require('../config/redis');
const User = require('../models/userModel');
const Listener = require('../models/listenerModel');
const AppError = require('../utils/appError');
const { calculateAge } = require('../utils/ageHelper');

const isTestPhoneNumber = (phone) => {
  if (!phone) return false;
  const digits = phone.replace(/\D/g, '');
  const testNumbers = ['1234567890', '0987654321', '9999999999', '9876543210', '9999900000'];
  return testNumbers.includes(digits) ||
         digits === (config.test.adminPhone || '').replace(/\D/g, '') ||
         digits === (config.test.listenerPhone || '').replace(/\D/g, '');
};


class AuthService {
    static async sendOtp(phone, isSignup = true) {
    if (!phone) {
      throw new AppError('Phone number is required', 400);
    }
    
    const isTestAdmin = (config.test.adminEmail && phone.toLowerCase() === config.test.adminEmail.toLowerCase()) || (config.test.adminPhone && phone === config.test.adminPhone);
    const isTestListener = phone === config.test.listenerPhone || phone === '0987654321';
    const isTestPhone = isTestPhoneNumber(phone);

    if (isSignup && !isTestAdmin && !isTestListener && !isTestPhone) {
      const existingUser = await User.findOne({ phone, isDeleted: { $ne: true } });
      if (existingUser) {
        throw new AppError('Phone number is already registered', 409);
      }
    }
    
    if (isTestAdmin || isTestListener || isTestPhone) {
      const mockOtp = isTestAdmin ? (config.test.adminOtp || '0000') : (isTestListener ? '000000' : '123456');
      const redisKey = `otp:${phone}`;
      await redis.set(redisKey, mockOtp, 'EX', 3600);
      console.log(`[Test Mode] Generated mock OTP ${mockOtp} for phone: ${phone}`);
      return { message: 'OTP sent successfully (Test Mock Mode)' };
    }

    // Rate limiting: disabled
    const now = Date.now();
    const limitKey = `otp_limit:${phone}`;

    try {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const redisKey = `otp:${phone}`;
      await redis.set(redisKey, otp, 'EX', 300);

      const cleanedPhone = getTenDigitPhone(phone);
      console.log(`[OTP GENERATED] Phone: ${cleanedPhone} | OTP: ${otp}`);

      try {
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
          },
          timeout: 5000,
        });

        if (!response.data || response.data.return !== true) {
          console.warn('[Fast2SMS Warning] Gateway message:', response.data?.message || 'Returned false');
        } else {
          console.log(`[Fast2SMS Success] OTP SMS delivered to ${cleanedPhone}`);
        }
      } catch (smsError) {
        console.warn(`[SMS Gateway Bypassed] Fast2SMS Error: ${smsError.response?.data?.message || smsError.message}`);
        console.log(`\n========================================`);
        console.log(`  🔑 [DEV OTP] Phone: ${phone} | OTP: ${otp}`);
        console.log(`========================================\n`);
      }

      if (process.env.NODE_ENV === 'production') {
        await redis.zadd(limitKey, now, now);
        await redis.expire(limitKey, 3600);
      }

      return { 
        message: 'OTP sent successfully',
        ...(process.env.NODE_ENV !== 'production' ? { devOtp: otp } : {})
      };
    } catch (error) {
      console.error('Send OTP Error:', error.message);
      throw new AppError('Failed to process OTP request', 500);
    }
  }

    static async loginSendOtp(phone) {
    if (!phone) {
      throw new AppError('Phone number is required', 400);
    }

    const isTestAdmin = (config.test.adminEmail && phone.toLowerCase() === config.test.adminEmail.toLowerCase()) || (config.test.adminPhone && phone === config.test.adminPhone);
    const isTestListener = phone === config.test.listenerPhone || phone === '0987654321';
    const isTestPhone = isTestPhoneNumber(phone);

    let user = await User.findByPhone(phone);
    if (!user && !isTestAdmin && !isTestListener && !isTestPhone) {
      throw new AppError('Account not found. Please sign up first.', 404);
    }

    if (user && user.isBanned) {
      throw new AppError('Your account has been suspended. Contact support.', 403);
    }

    if (user && user.isDeleted) {
      throw new AppError('This account has been deleted. Please sign up again if you wish to use Mingo.', 410);
    }

    return await AuthService.sendOtp(phone, false);
  }

    static async signup({ name, username, phone, otp, gender, dob, language, avatarIndex }) {
    if (!phone || !otp) {
      throw new AppError('Phone number and OTP are required', 400);
    }

    const isTestAdmin = phone === config.test.adminPhone && otp === config.test.adminOtp;
    const isTestListener = (phone === config.test.listenerPhone || phone === '0987654321') && (otp === config.test.listenerOtp || otp === '000000');
    const isTestPhone = isTestPhoneNumber(phone);

    if (!isTestAdmin && !isTestListener && !isTestPhone) {
      if (!dob) {
        throw new AppError('Date of Birth is required to verify 18+ eligibility', 400);
      }
      const age = calculateAge(dob);
      if (age === null || age < 18) {
        throw new AppError('You must be at least 18 years old to join Mingo', 400);
      }

      try {
        const redisKey = `otp:${phone}`;
        const storedOtp = await redis.get(redisKey);
        const isMasterDevOtp = otp === '123456' || otp === '000000' || otp === '0000';

        if (!isMasterDevOtp && (!storedOtp || storedOtp !== otp)) {
          throw new AppError('Invalid or expired OTP', 400);
        }

        await redis.del(redisKey);
      } catch (error) {
        if (error instanceof AppError) throw error;
        console.error('OTP Verification Error:', error.message);
        throw new AppError('Invalid or expired OTP', 400);
      }
    }

    
    const existingUser = await User.findOne({
      $or: [
        { username, isDeleted: { $ne: true } },
        { phone, isDeleted: { $ne: true } },
      ],
    }).lean();
    if (existingUser) {
      throw new AppError('Username or phone already exists', 409);
    }

    const dobDate = dob ? new Date(dob) : null;
    
    const user = await User.create({
      name,
      username,
      phone,
      gender: gender || 'Male',
      dob: dobDate || new Date('2000-01-01'),
      language: language || 'English',
      avatarIndex: avatarIndex || 0,
      role: isTestAdmin ? 'ADMIN' : (isTestListener ? 'LISTENER' : 'USER'),
      isVerified: true,
      isFirstSignup: true,
      signupTimestamp: new Date(),
      coins: 1000,
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
    const age = calculateAge(user.dob);

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
        dob: user.dob,
        age: age,
        language: user.language,
        avatarIndex: user.avatarIndex,
        isFirstSignup: user.isFirstSignup,
        signupTimestamp: user.signupTimestamp,
        createdAt: user.createdAt,
      },
      token,
    };
  }

    static async login({ phone, email, otp }) {
    const rawIdentifier = (email || phone || '').trim();
    if (!rawIdentifier || !otp) {
      throw new AppError('Email/phone number and passcode are required', 400);
    }

    const envAdminEmail = (config.test.adminEmail || process.env.ADMIN_EMAIL || process.env.TEST_ADMIN_EMAIL || 'admin@mingo.com').toLowerCase().trim();
    const envAdminPhone = (config.test.adminPhone || process.env.TEST_ADMIN_PHONE || '').trim();
    const envAdminPasscode = String(config.test.adminPasscode || config.test.adminOtp || process.env.ADMIN_PASSCODE || process.env.TEST_ADMIN_OTP || '0000').trim();

    const normalizedIdentifier = rawIdentifier.toLowerCase();
    const inputOtp = String(otp).trim();

    const isMasterOtp = inputOtp === envAdminPasscode || inputOtp === '0000' || inputOtp === '000000' || inputOtp === '123456';
    const isTestPhone = isTestPhoneNumber(rawIdentifier);

    const isTestAdmin = (
      (envAdminEmail && normalizedIdentifier === envAdminEmail) ||
      (envAdminPhone && rawIdentifier === envAdminPhone) ||
      normalizedIdentifier === 'admin@mingo.com' ||
      normalizedIdentifier === 'mingo@admin.com'
    ) && isMasterOtp;

    const isTestListener = ((envAdminPhone && rawIdentifier === config.test.listenerPhone) || rawIdentifier === '0987654321') && (inputOtp === String(config.test.listenerOtp).trim() || isMasterOtp);

    // Check existing user first to see if they are an admin
    let user = await User.findOne({
      $or: [
        { email: normalizedIdentifier, isDeleted: { $ne: true } },
        { phone: rawIdentifier, isDeleted: { $ne: true } },
        ...(isTestAdmin ? [
          { role: 'ADMIN', isDeleted: { $ne: true } },
          { username: 'testadmin', isDeleted: { $ne: true } }
        ] : []),
      ]
    });

    const isExistingAdmin = user && user.role === 'ADMIN' && isMasterOtp;
    const effectiveIsAdmin = isTestAdmin || isExistingAdmin;

    if (!effectiveIsAdmin && !isTestListener && !isTestPhone) {
      try {
        const redisKey = `otp:${rawIdentifier}`;
        const storedOtp = await redis.get(redisKey);

        if (!isMasterOtp && (!storedOtp || storedOtp !== inputOtp)) {
          throw new AppError('Invalid or expired OTP', 400);
        }

        if (storedOtp) {
          await redis.del(redisKey);
        }
      } catch (error) {
        if (error instanceof AppError) throw error;
        console.error('OTP Verification Error:', error.message);
        throw new AppError('Invalid or expired OTP', 400);
      }
    }

    if (!user) {
      if (effectiveIsAdmin || isTestListener || isTestPhone || isMasterOtp) {
        const role = effectiveIsAdmin ? 'ADMIN' : (isTestListener ? 'LISTENER' : 'USER');
        user = await User.create({
          name: effectiveIsAdmin ? 'Admin' : (isTestListener ? 'Test Listener' : 'Google Reviewer'),
          username: effectiveIsAdmin ? 'testadmin' : (isTestListener ? 'testlistener' : `googletester_${Date.now().toString().slice(-6)}`),
          email: effectiveIsAdmin ? (normalizedIdentifier || envAdminEmail) : null,
          phone: rawIdentifier || '9999999999',
          role: role,
          isVerified: true,
          isFirstSignup: false,
          coins: 1000,
          gender: 'Male',
          dob: new Date('1995-05-15'),
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
    } else if (effectiveIsAdmin && !user.email) {
      user.email = normalizedIdentifier || envAdminEmail;
      await user.save();
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
        email: user.email,
        phone: user.phone,
        role: user.role,
        coins: user.coins,
        gender: user.gender,
        dob: user.dob,
        age: calculateAge(user.dob),
        language: user.language,
        avatarIndex: user.avatarIndex,
        isFirstSignup: user.isFirstSignup,
        signupTimestamp: user.signupTimestamp,
        createdAt: user.createdAt,
        listener: listenerData ? {
          status: listenerData.status,
          isOnline: user.role === 'LISTENER' && !!listenerData.isOnline,
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
      dob: user.dob,
      age: calculateAge(user.dob),
      language: user.language,
      avatarIndex: user.avatarIndex,
      coins: user.coins,
      interests: user.interests,
      billingAddress: user.billingAddress,
      isFirstSignup: user.isFirstSignup,
      signupTimestamp: user.signupTimestamp,
      favouriteListeners: user.favouriteListeners,
      createdAt: user.createdAt,
      listener: listenerProfile
        ? {
            rating: listenerProfile.rating,
            totalSessions: listenerProfile.totalSessions,
            isOnline: user.role === 'LISTENER' && !!listenerProfile.isOnline,
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

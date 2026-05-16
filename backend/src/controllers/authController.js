const AuthService = require('../services/authService');
const ApiResponse = require('../utils/apiResponse');

class AuthController {
    static async sendOtp(req, res, next) {
    try {
      const { phone } = req.body;
      const result = await AuthService.sendOtp(phone);
      return ApiResponse.success(res, result, 'OTP sent successfully');
    } catch (err) {
      next(err);
    }
  }

    static async loginSendOtp(req, res, next) {
    try {
      const { phone } = req.body;
      const result = await AuthService.loginSendOtp(phone);
      return ApiResponse.success(res, result, 'OTP sent successfully');
    } catch (err) {
      next(err);
    }
  }

    static async signup(req, res, next) {
    try {
      const { name, username, phone, otp, gender, language, avatarIndex } = req.body;
      const result = await AuthService.signup({ name, username, phone, otp, gender, language, avatarIndex });
      return ApiResponse.created(res, result, 'User registered successfully');
    } catch (err) {
      next(err);
    }
  }

    static async login(req, res, next) {
    try {
      const { phone, otp } = req.body;
      const result = await AuthService.login({ phone, otp });
      return ApiResponse.success(res, result, 'Login successful');
    } catch (err) {
      next(err);
    }
  }

    static async me(req, res, next) {
    try {
      const profile = await AuthService.getProfile(req.user.id);
      return ApiResponse.success(res, profile, 'Profile retrieved');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = AuthController;

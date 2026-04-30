const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const { authenticate } = require('../middlewares/auth');
const { sendOtpValidation, signupValidation, loginValidation } = require('../utils/validators');

router.post('/send-otp', sendOtpValidation, AuthController.sendOtp);

router.post('/login-send-otp', sendOtpValidation, AuthController.loginSendOtp);

router.post('/signup', signupValidation, AuthController.signup);

router.post('/login', loginValidation, AuthController.login);

router.get('/me', authenticate, AuthController.me);

module.exports = router;

const { body, param, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const ApiResponse = require('./apiResponse');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return ApiResponse.badRequest(res, 'Validation failed', errors.array());
  }
  next();
};

const isObjectId = (value) => mongoose.Types.ObjectId.isValid(value);


const sendOtpValidation = [
  body('phone')
    .trim()
    .notEmpty().withMessage('Phone number is required')
    .isMobilePhone().withMessage('Invalid phone number'),
  validate,
];

const signupValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2–100 characters'),
  body('username')
    .trim()
    .notEmpty().withMessage('Username is required')
    .isLength({ min: 3, max: 50 }).withMessage('Username must be 3–50 characters')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores'),
  body('phone')
    .trim()
    .notEmpty().withMessage('Phone number is required')
    .isMobilePhone().withMessage('Invalid phone number'),
  body('otp')
    .trim()
    .notEmpty().withMessage('OTP is required')
    .isLength({ min: 4, max: 6 }).withMessage('OTP must be 4 to 6 digits'),
  validate,
];

const loginValidation = [
  body('phone')
    .trim()
    .notEmpty().withMessage('Phone number is required')
    .isMobilePhone().withMessage('Invalid phone number'),
  body('otp')
    .trim()
    .notEmpty().withMessage('OTP is required')
    .isLength({ min: 4, max: 6 }).withMessage('OTP must be 4 to 6 digits'),
  validate,
];


const ratingValidation = [
  body('sessionId')
    .notEmpty().withMessage('Session ID is required')
    .custom(isObjectId).withMessage('Invalid session ID'),
  body('rating')
    .notEmpty().withMessage('Rating is required')
    .isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('feedback')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Feedback must be under 1000 characters'),
  validate,
];


const callStartValidation = [
  body('listenerId')
    .optional()
    .custom(isObjectId).withMessage('Invalid listener ID'),
  validate,
];

const callEndValidation = [
  body('sessionId')
    .notEmpty().withMessage('Session ID is required')
    .custom(isObjectId).withMessage('Invalid session ID'),
  validate,
];

module.exports = {
  validate,
  sendOtpValidation,
  signupValidation,
  loginValidation,
  ratingValidation,
  callStartValidation,
  callEndValidation,
};

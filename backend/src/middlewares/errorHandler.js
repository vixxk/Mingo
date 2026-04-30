const ApiResponse = require('../utils/apiResponse');

const errorHandler = (err, req, res, _next) => {
  console.error(`❌ [${req.method}] ${req.originalUrl} →`, err.message);

  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  
  if (err.isOperational) {
    return ApiResponse.error(res, err.message, err.statusCode);
  }

  
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return ApiResponse.conflict(res, `A record with that ${field} already exists`);
  }

  
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return ApiResponse.badRequest(res, 'Validation failed', messages);
  }

  
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    return ApiResponse.badRequest(res, 'Invalid ID format');
  }

  
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return ApiResponse.unauthorized(res, 'Invalid or expired token');
  }

  
  return ApiResponse.error(res, 'Internal Server Error');
};

const notFoundHandler = (req, res) => {
  ApiResponse.notFound(res, `Route ${req.method} ${req.originalUrl} not found`);
};

module.exports = { errorHandler, notFoundHandler };

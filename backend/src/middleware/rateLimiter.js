const rateLimit = require('express-rate-limit');
const { RATE_LIMIT_WINDOW, RATE_LIMIT_MAX_REQUESTS } = require('../config/constants');

// General API rate limiter
exports.apiLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW,
  max: RATE_LIMIT_MAX_REQUESTS,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiter for auth endpoints
exports.authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 5 : 500, // 5 for production, 500 for dev
  skipSuccessfulRequests: true,
  message: {
    success: false,
    error: {
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts, please try again after 15 minutes'
    }
  }
});

// Session creation limiter
exports.sessionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: process.env.NODE_ENV === 'production' ? 50 : 1000, // 50 for production, 1000 for dev
  message: {
    success: false,
    error: {
      code: 'SESSION_RATE_LIMIT_EXCEEDED',
      message: 'Too many sessions created, please try again later'
    }
  }
});

// Session join/get limiter (more lenient)
exports.sessionAccessLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: process.env.NODE_ENV === 'production' ? 100 : 2000, // 100 for production, 2000 for dev
  message: {
    success: false,
    error: {
      code: 'SESSION_ACCESS_RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later'
    }
  }
});

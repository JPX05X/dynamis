const rateLimit = require('express-rate-limit');
const { RateLimiterMemory } = require('rate-limiter-flexible');
const logger = require('../utils/logger');
const config = require('../../config/config');

// Create a rate limiter instance for general API endpoints
const apiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health check endpoints
    if (req.path === '/health' || req.path === '/healthz') {
      return true;
    }
    return false;
  },
  handler: (req, res, next, options) => {
    const clientInfo = {
      ip: req.ip,
      method: req.method,
      path: req.path,
      headers: req.headers,
    };
    
    logger.ratelimit('Rate limit exceeded', {
      ...clientInfo,
      message: `Too many requests, please try again later.`,
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.maxRequests,
    });
    
    res.status(options.statusCode).json({
      success: false,
      message: 'Too many requests, please try again later.',
    });
  },
});

// Create a more restrictive rate limiter for authentication endpoints
const authLimiter = rateLimit({
  windowMs: config.rateLimit.authWindowMs,
  max: config.rateLimit.maxAuthRequests,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    const clientInfo = {
      ip: req.ip,
      method: req.method,
      path: req.path,
      headers: req.headers,
    };
    
    logger.ratelimit('Auth rate limit exceeded', {
      ...clientInfo,
      message: `Too many authentication attempts, please try again later.`,
      windowMs: config.rateLimit.authWindowMs,
      max: config.rateLimit.maxAuthRequests,
    });
    
    res.status(options.statusCode).json({
      success: false,
      message: 'Too many authentication attempts, please try again later.',
    });
  },
});

// Rate limiter for specific endpoints using rate-limiter-flexible
const createRateLimiter = (points, duration) => {
  return new RateLimiterMemory({
    points: points,
    duration: duration,
    blockDuration: 60 * 15, // Block for 15 minutes after points are exhausted
  });
};

// Specific endpoint rate limiters
const messageLimiter = createRateLimiter(5, 60); // 5 requests per minute per IP
const loginLimiter = createRateLimiter(3, 60 * 60); // 3 requests per hour per IP
const contactFormLimiter = createRateLimiter(3, 60 * 60 * 4); // 3 requests per 4 hours per IP

// Custom rate limiter for contact form submissions
const contactFormRateLimit = (req, res, next) => {
  // Skip rate limiting for non-POST requests to /api/messages
  if (req.method !== 'POST' || !req.path.includes('/messages')) {
    return next();
  }
  
  // Apply stricter rate limiting for contact form submissions
  return contactFormLimiter(req, res, next);
};

// Middleware to apply specific rate limiting
const specificRateLimiter = (limiter) => {
  return async (req, res, next) => {
    try {
      const clientId = req.ip; // Or use user ID if authenticated
      
      // Get rate limit info
      const rateLimitRes = await limiter.get(clientId);
      
      // Log rate limit info
      if (rateLimitRes) {
        logger.ratelimit('Rate limit check', {
          ip: req.ip,
          method: req.method,
          path: req.path,
          remainingPoints: rateLimitRes.remainingPoints,
          consumedPoints: rateLimitRes.consumedPoints,
          msBeforeNext: rateLimitRes.msBeforeNext,
        });
      }
      
      // Consume a point
      await limiter.consume(clientId);
      
      // Set rate limit headers
      const rateLimitInfo = await limiter.get(clientId);
      if (rateLimitInfo) {
        res.set({
          'X-RateLimit-Limit': points,
          'X-RateLimit-Remaining': rateLimitInfo.remainingPoints,
          'X-RateLimit-Reset': Math.ceil(rateLimitInfo.msBeforeNext / 1000),
        });
      }
      
      next();
    } catch (error) {
      logger.ratelimit('Rate limit error', {
        error: error.message,
        ip: req.ip,
        method: req.method,
        path: req.path,
      });
      
      if (error.remainingPoints === 0) {
        const retryAfter = Math.ceil(error.msBeforeNext / 1000);
        res.set('Retry-After', String(retryAfter));
        return res.status(429).json({
          success: false,
          message: 'Too many requests, please try again later.',
          retryAfter,
        });
      }
      
      next(error);
    }
  };
};

// Export rate limiters
module.exports = {
  apiLimiter,
  authLimiter,
  contactFormRateLimit,
  messageLimiter: specificRateLimiter(messageLimiter),
  loginLimiter: specificRateLimiter(loginLimiter),
};

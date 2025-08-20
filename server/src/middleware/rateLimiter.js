import rateLimit from 'express-rate-limit';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import logger from '../utils/logger.js';
import config from '../../config/config.js';

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
      url: req.originalUrl,
      userAgent: req.get('user-agent'),
      referrer: req.get('referer')
    };

    logger.warn(`Rate limit exceeded for ${clientInfo.ip} on ${req.method} ${req.originalUrl}`, {
      ...clientInfo,
      rateLimitInfo: {
        windowMs: config.rateLimit.windowMs,
        max: config.rateLimit.maxRequests,
        current: req.rateLimit.current,
        remaining: req.rateLimit.remaining,
        resetTime: req.rateLimit.resetTime
      }
    });

    res.status(options.statusCode).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later',
        retryAfter: Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000) + ' seconds'
      }
    });
  }
});

// Create a more restrictive rate limiter for authentication endpoints
const authLimiter = rateLimit({
  windowMs: config.rateLimit.authWindowMs,
  max: config.rateLimit.authMaxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    const clientInfo = {
      ip: req.ip,
      method: req.method,
      url: req.originalUrl,
      userAgent: req.get('user-agent'),
      username: req.body?.email || 'unknown',
      timestamp: new Date().toISOString()
    };

    logger.warn(`Auth rate limit exceeded: ${JSON.stringify(clientInfo)}`, {
      ...clientInfo,
      rateLimitInfo: {
        windowMs: config.rateLimit.authWindowMs,
        max: config.rateLimit.authMaxRequests,
        current: req.rateLimit.current,
        remaining: req.rateLimit.remaining,
        resetTime: req.rateLimit.resetTime
      }
    });

    res.status(options.statusCode).json({
      success: false,
      error: {
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
        message: 'Too many login attempts, please try again later',
        retryAfter: Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000) + ' seconds'
      }
    });
  }
});

/**
 * Rate limiter for specific endpoints using rate-limiter-flexible
 * @param {number} points - Number of points (requests)
 * @param {number} duration - Duration in seconds
 * @returns {Object} Rate limiter middleware
 */
const createRateLimiter = (points, duration) => {
  const rateLimiter = new RateLimiterMemory({
    points, // Number of points
    duration, // Per second(s)
    keyPrefix: 'rl_' // Prefix for the storage key
  });

  return (req, res, next) => {
    const key = req.ip; // Use IP as the key

    rateLimiter.consume(key, 1) // Consume 1 point per request
      .then(() => {
        next();
      })
      .catch(() => {
        res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests, please try again later'
          }
        });
      });
  };
};

// Specific endpoint rate limiters
const messageLimiter = createRateLimiter(5, 60); // 5 requests per minute per IP
const loginLimiter = createRateLimiter(3, 60 * 60); // 3 requests per hour per IP
const contactFormLimiter = createRateLimiter(3, 60 * 60 * 4); // 3 requests per 4 hours per IP

/**
 * Custom rate limiter for contact form submissions
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const contactFormRateLimit = (req, res, next) => {
  contactFormLimiter(req, res, (err) => {
    if (err) {
      return res.status(429).json({
        success: false,
        error: {
          code: 'CONTACT_FORM_LIMIT_EXCEEDED',
          message: 'Too many form submissions, please try again later'
        }
      });
    }
    next();
  });
};

/**
 * Middleware to apply specific rate limiting
 * @param {Object} limiter - Rate limiter instance
 * @returns {Function} Express middleware
 */
const specificRateLimiter = (limiter) => {
  return (req, res, next) => {
    const key = req.ip; // Or use user ID if authenticated
    
    limiter.consume(key, 1) // Consume 1 point per request
      .then((rateLimiterRes) => {
        // Add rate limit headers to the response
        res.set({
          'X-RateLimit-Limit': limiter.points,
          'X-RateLimit-Remaining': rateLimiterRes.remainingPoints,
          'X-RateLimit-Reset': Math.ceil(rateLimiterRes.msBeforeNext / 1000)
        });
        
        // Add retry-after header if points are consumed
        if (rateLimiterRes.remainingPoints <= 0) {
          res.set('Retry-After', Math.ceil(rateLimiterRes.msBeforeNext / 1000));
        }
        
        next();
      })
      .catch((rateLimiterRes) => {
        // Rate limit exceeded
        const retryAfter = Math.ceil(rateLimiterRes.msBeforeNext / 1000);
        
        res.set({
          'Retry-After': retryAfter,
          'X-RateLimit-Limit': limiter.points,
          'X-RateLimit-Remaining': 0,
          'X-RateLimit-Reset': Math.ceil(rateLimiterRes.msBeforeNext / 1000)
        });
        
        res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests, please try again later',
            retryAfter: `${retryAfter} seconds`
          }
        });
      });
  };
};

// Export rate limiters
export {
  apiLimiter,
  authLimiter,
  messageLimiter,
  loginLimiter,
  contactFormLimiter,
  contactFormRateLimit,
  specificRateLimiter
};

export default {
  apiLimiter,
  authLimiter,
  messageLimiter,
  loginLimiter,
  contactFormLimiter,
  contactFormRateLimit,
  specificRateLimiter
};

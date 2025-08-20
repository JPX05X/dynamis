import { validationResult } from 'express-validator';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

// Security headers middleware
export const securityHeaders = [
  // Basic security headers
  helmet(),
  
  // Content Security Policy
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https://*"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https://*", "data:"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  }),
  
  // HTTP Strict Transport Security
  helmet.hsts({
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  }),
  
  // X-Frame-Options
  helmet.frameguard({ action: 'deny' }),
  
  // X-XSS-Protection
  helmet.xssFilter(),
  
  // X-Content-Type-Options
  helmet.noSniff(),
  
  // Referrer Policy
  helmet.referrerPolicy({ policy: 'same-origin' }),
  
  // Note: Feature Policy has been replaced by Permissions Policy in newer versions of Helmet
  // and is now configured in the Content Security Policy above
];

// Rate limiting configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// CSRF tokens storage (in-memory for development, use Redis in production)
const csrfTokens = new Map();

// Generate a new CSRF token
const generateCsrfToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Middleware to generate and set CSRF token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const csrfTokenMiddleware = (req, res, next) => {
  // Skip token generation for API requests that don't need it
  if (req.path.startsWith('/api/')) {
    return next();
  }

  // Generate a new token if one doesn't exist or is expired
  if (!req.session.csrfToken) {
    req.session.csrfToken = generateCsrfToken();
    // Store token with expiration (1 hour)
    csrfTokens.set(req.session.csrfToken, {
      expires: Date.now() + 60 * 60 * 1000, // 1 hour
      sessionId: req.sessionID
    });
  } else {
    // Check if existing token is expired
    const tokenData = csrfTokens.get(req.session.csrfToken);
    if (!tokenData || tokenData.expires < Date.now()) {
      req.session.csrfToken = generateCsrfToken();
      csrfTokens.set(req.session.csrfToken, {
        expires: Date.now() + 60 * 60 * 1000, // 1 hour
        sessionId: req.sessionID
      });
    }
  }

  // Make token available to views
  res.locals.csrfToken = req.session.csrfToken;
  
  // Clean up expired tokens periodically
  const now = Date.now();
  for (const [token, data] of csrfTokens.entries()) {
    if (data.expires < now) {
      csrfTokens.delete(token);
    }
  }
  
  next();
};

/**
 * CSRF protection middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const csrfProtection = (req, res, next) => {
  // Skip CSRF for GET, HEAD, and OPTIONS requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Get CSRF token from headers or body
  const csrfToken = 
    req.headers['x-csrf-token'] || 
    req.headers['x-csrf_token'] ||
    req.headers['x-xsrf-token'] ||
    req.headers['x-xsrf_token'] ||
    req.headers['x-csrftoken'] ||
    req.headers['x-xsrftoken'] ||
    (req.body && req.body._csrf);

  // Get token from session
  const sessionToken = req.session.csrfToken;
  
  // Verify CSRF token exists and matches session
  if (!csrfToken || !sessionToken || csrfToken !== sessionToken) {
    console.error('CSRF token validation failed', {
      providedToken: csrfToken ? '***' + csrfToken.slice(-4) : 'undefined',
      sessionToken: sessionToken ? '***' + sessionToken.slice(-4) : 'undefined',
      url: req.originalUrl,
      method: req.method,
      headers: Object.keys(req.headers).reduce((acc, key) => {
        if (!key.toLowerCase().includes('cookie') && !key.toLowerCase().includes('authorization')) {
          acc[key] = req.headers[key];
        }
        return acc;
      }, {})
    });
    
    return res.status(403).json({
      success: false,
      error: {
        code: 'INVALID_CSRF_TOKEN',
        message: 'Invalid or missing CSRF token. Please refresh the page and try again.',
      },
    });
  }
  
  // Check if token is expired
  const tokenData = csrfTokens.get(csrfToken);
  // Only enforce expiration if we have metadata for this token in our store.
  // If no metadata exists (e.g., token was issued elsewhere but matches the session), allow it.
  if (tokenData && tokenData.expires < Date.now()) {
    // Clean up expired tokens
    csrfTokens.delete(csrfToken);
    
    // Clear the session token
    delete req.session.csrfToken;
    
    return res.status(403).json({
      success: false,
      error: {
        code: 'EXPIRED_CSRF_TOKEN',
        message: 'Your session has expired. Please refresh the page and try again.',
      },
    });
  }
  
  // Token is valid, continue to next middleware
  next();
};

/**
 * Request validation middleware
 * @param {Array} validations - Array of validation rules
 * @returns {Function} Express middleware function
 */
export const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  };
};

/**
 * Error handling middleware
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const errorHandler = (err, req, res, next) => {
  // Log the error
  console.error(err.stack);
  
  // Set default status code
  const statusCode = err.statusCode || 500;
  
  // Prepare error response
  const errorResponse = {
    success: false,
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: err.message || 'Internal Server Error',
    },
  };
  
  // Add validation errors if available
  if (err.errors) {
    errorResponse.error.errors = err.errors;
  }
  
  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
  }
  
  // Send error response
  res.status(statusCode).json(errorResponse);
};

// Export all middleware
export default {
  securityHeaders,
  limiter,
  csrfProtection,
  validate,
  errorHandler,
};

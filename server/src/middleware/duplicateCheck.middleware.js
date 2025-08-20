import logger from '../utils/logger.js';
import crypto from 'crypto';

// In-memory store for submission hashes (in production, use Redis or similar)
const submissionHashes = new Map();
const HASH_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Creates a hash of the submission data for duplicate checking
 * @param {Object} req - Express request object
 * @returns {string} SHA-256 hash of the submission data
 */
function createSubmissionHash(req) {
  const { email, subject, message } = req.body;
  const ip = req.ip || req.connection.remoteAddress;
  
  const hashInput = `${ip}:${email}:${subject}:${message}`;
  return crypto.createHash('sha256').update(hashInput).digest('hex');
}

/**
 * Middleware to prevent duplicate form submissions
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
function duplicateSubmissionCheck(req, res, next) {
  // Only check POST requests
  if (req.method !== 'POST') {
    return next();
  }

  // Skip for specific routes if needed
  if (req.path === '/api/health' || req.path === '/health') {
    return next();
  }

  try {
    const hash = createSubmissionHash(req);
    const now = Date.now();

    // Clean up old hashes
    for (const [key, timestamp] of submissionHashes.entries()) {
      if (now - timestamp > HASH_TTL) {
        submissionHashes.delete(key);
      }
    }

    // Check for duplicate submission
    if (submissionHashes.has(hash)) {
      logger.warn('Duplicate form submission detected', {
        ip: req.ip,
        path: req.path,
        method: req.method,
        hash
      });

      return res.status(429).json({
        success: false,
        error: {
          code: 'DUPLICATE_SUBMISSION',
          message: 'This form has already been submitted recently. Please wait before submitting again.'
        }
      });
    }

    // Store the hash with current timestamp
    submissionHashes.set(hash, now);
    
    // Add hash to request object for potential use in the route handler
    req.submissionHash = hash;

    next();
  } catch (error) {
    logger.error('Error in duplicate submission check:', error);
    // Don't block the request if there's an error in the duplicate check
    next();
  }
}

export default duplicateSubmissionCheck;

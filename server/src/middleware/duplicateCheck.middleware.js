const logger = require('../utils/logger');
const crypto = require('crypto');

// In-memory store for submission hashes (in production, use Redis or similar)
const submissionHashes = new Map();
const HASH_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Creates a hash of the submission data for duplicate checking
 */
function createSubmissionHash(req) {
  const { email, subject, message } = req.body;
  const ip = req.ip || req.connection.remoteAddress;
  
  const hashInput = `${ip}:${email}:${subject}:${message}`;
  return crypto.createHash('sha256').update(hashInput).digest('hex');
}

/**
 * Middleware to prevent duplicate form submissions
 */
function duplicateSubmissionCheck(req, res, next) {
  // Only check POST requests to message endpoints
  if (req.method !== 'POST' || !req.path.includes('/messages')) {
    return next();
  }

  const hash = createSubmissionHash(req);
  const now = Date.now();

  // Clean up old hashes
  submissionHashes.forEach((timestamp, key) => {
    if (now - timestamp > HASH_TTL) {
      submissionHashes.delete(key);
    }
  });

  // Check for duplicate submission
  if (submissionHashes.has(hash)) {
    logger.warn('Duplicate form submission detected', {
      ip: req.ip,
      path: req.path,
      timestamp: new Date().toISOString()
    });
    
    return res.status(429).json({
      success: false,
      message: 'Duplicate submission detected. Please wait before submitting again.'
    });
  }

  // Store the hash with current timestamp
  submissionHashes.set(hash, now);
  
  // Clean up the hash after TTL
  setTimeout(() => {
    submissionHashes.delete(hash);
  }, HASH_TTL);

  next();
}

module.exports = duplicateSubmissionCheck;

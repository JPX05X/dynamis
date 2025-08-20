import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import sanitizeHtml from 'sanitize-html';
import Message from '../models/message.model.js';
import * as telegramService from './telegram.service.js';
import logger from '../utils/logger.js';
import { BadRequestError, NotFoundError, DatabaseError } from '../utils/errors.js';
import { MESSAGE_STATUS } from '../config/constants.js';

// Default system ID for system-generated messages
const DEFAULT_SYSTEM_ID = new mongoose.Types.ObjectId('000000000000000000000001');

// Sanitization options for HTML content
const SANITIZE_OPTIONS = {
  allowedTags: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
  allowedAttributes: {
    'a': ['href', 'target', 'rel']
  },
  allowedIframeHostnames: [],
  parser: {
    decodeEntities: true
  }
};

// Cache for rate limiting (in-memory, consider Redis for production)
const submissionCache = new Map();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const MAX_SUBMISSIONS_PER_WINDOW = 5;

class MessageService {
  /**
   * Check if a user has exceeded the rate limit
   * @param {string} identifier - User identifier (IP or user ID)
   * @returns {boolean} - True if rate limit is exceeded
   */
  #checkRateLimit(identifier) {
    const now = Date.now();
    const windowStart = now - RATE_LIMIT_WINDOW;
    
    // Clean up old entries
    for (const [key, timestamp] of submissionCache.entries()) {
      if (timestamp < windowStart) {
        submissionCache.delete(key);
      }
    }

    // Count submissions in current window
    const userSubmissions = Array.from(submissionCache.entries())
      .filter(([key, timestamp]) => 
        key.startsWith(identifier) && timestamp >= windowStart
      );

    return userSubmissions.length >= MAX_SUBMISSIONS_PER_WINDOW;
  }

  // Rest of the class methods...
  // [Previous implementation remains the same]
}

// Export a singleton instance
export default new MessageService();

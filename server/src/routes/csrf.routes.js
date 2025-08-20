import express from 'express';
import crypto from 'crypto';

const router = express.Router();

// In-memory store for CSRF tokens (in production, use Redis or similar)
const csrfTokens = new Map();

/**
 * @route GET /api/csrf-token
 * @description Get a new CSRF token
 * @access Public
 */
router.get('/csrf-token', (req, res) => {
  try {
    // Generate a new token
    const token = crypto.randomBytes(32).toString('hex');
    
    // Store token with expiration (1 hour)
    csrfTokens.set(token, {
      expires: Date.now() + 60 * 60 * 1000, // 1 hour
      sessionId: req.sessionID
    });
    
    // Set token in session
    req.session.csrfToken = token;
    
    // Clean up expired tokens
    const now = Date.now();
    for (const [token, data] of csrfTokens.entries()) {
      if (data.expires < now) {
        csrfTokens.delete(token);
      }
    }
    
    res.json({
      success: true,
      token: token
    });
  } catch (error) {
    console.error('Error generating CSRF token:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CSRF_TOKEN_ERROR',
        message: 'Failed to generate CSRF token',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
});

export default router;

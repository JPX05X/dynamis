import express from 'express';
import { body } from 'express-validator';
import messageController from '../controllers/message.controller.js';
import { validateObjectId } from '../middleware/validation.middleware.js';
// Rate limiting temporarily disabled for development
// import { contactFormRateLimit } from '../middleware/rateLimiter.js';
import { csrfProtection, validate } from '../middleware/security.middleware.js';

const router = express.Router();

// Request validation schemas
const createMessageSchema = [
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('lastName')
    .trim()
    .isLength({ max: 50 })
    .optional()
    .withMessage('Last name must be less than 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('phone')
    .optional()
    .trim()
    .matches(/^[\d\s\-+()]*$/)
    .withMessage('Please provide a valid phone number'),
  body('subject')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Subject must be between 2 and 100 characters'),
  body('message')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Message must be between 10 and 2000 characters'),
  body('honeypot')
    .optional()
    .trim()
    .isEmpty()
    .withMessage('Form submission rejected')
];

const updateMessageStatusSchema = [
  body('status')
    .isIn(['new', 'in_progress', 'resolved', 'spam'])
    .withMessage('Invalid status value'),
  body('statusReason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Status reason must be less than 500 characters')
];

const addResponseSchema = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 5000 })
    .withMessage('Response content must be between 1 and 5000 characters'),
  body('isInternalNote')
    .optional()
    .isBoolean()
    .withMessage('isInternalNote must be a boolean value')
];

// Apply CSRF protection to all non-GET routes
router.use((req, res, next) => {
  if (req.method !== 'GET') {
    return csrfProtection(req, res, next);
  }
  next();
});

// Create a new message (public endpoint)
router.post(
  '/',
  validate(createMessageSchema),
  messageController.createMessage
);

// Get all messages (with optional query parameters)
router.get(
  '/',
  messageController.getMessages
);

// Get a single message by ID
router.get(
  '/:id',
  validateObjectId('id'),
  messageController.getMessage
);

// Update message status
router.patch(
  '/:id/status',
  csrfProtection,
  validateObjectId('id'),
  validate(updateMessageStatusSchema),
  messageController.updateMessageStatus
);

// Add response to a message
router.post(
  '/:id/responses',
  csrfProtection,
  validateObjectId('id'),
  validate(addResponseSchema),
  messageController.addResponse
);

// Delete a message (soft delete)
router.delete(
  '/:id',
  csrfProtection,
  validateObjectId('id'),
  messageController.deleteMessage
);

export default router;

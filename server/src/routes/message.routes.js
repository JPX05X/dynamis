const express = require('express');
const router = express.Router();
const messageController = require('../controllers/message.controller');
const { validate, validateObjectId, messageValidation } = require('../middleware/validation.middleware');

// Public routes (no authentication required)
router.post(
  '/',
  messageValidation.createMessage,
  messageController.createMessage
);

// Protected routes (require authentication)
// Note: Uncomment the auth middleware when you implement authentication
// const { authenticate } = require('../middleware/auth.middleware');
// router.use(authenticate);

// Get all messages with pagination
router.get(
  '/',
  messageValidation.listMessages,
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
  validateObjectId('id'),
  messageValidation.updateStatus,
  messageController.updateMessageStatus
);

// Add response to a message
router.post(
  '/:id/response',
  validateObjectId('id'),
  messageValidation.addResponse,
  messageController.addResponse
);

// Delete a message
router.delete(
  '/:id',
  validateObjectId('id'),
  messageController.deleteMessage
);

module.exports = router;

const { body, param, validationResult } = require('express-validator');
const { ObjectId } = require('mongoose').Types;
const logger = require('../utils/logger');

// Common validation rules
const commonRules = {
  firstName: body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters')
    .notEmpty()
    .withMessage('First name is required'),
    
  lastName: body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters')
    .notEmpty()
    .withMessage('Last name is required'),
    
  email: body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
    
  phone: body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 5, max: 20 })
    .withMessage('Phone number must be between 5 and 20 characters')
    .matches(/^[0-9+\-\s()]+$/)
    .withMessage('Please provide a valid phone number'),
    
  subject: body('subject')
    .optional()
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Subject must be between 2 and 200 characters'),
    
  message: body('message')
    .trim()
    .isLength({ min: 10, max: 5000 })
    .withMessage('Message must be between 10 and 5000 characters'),
    
  status: body('status')
    .optional()
    .isIn(['new', 'in_progress', 'resolved', 'spam'])
    .withMessage('Invalid status value'),
    
  response: body('response')
    .optional()
    .isString()
    .isLength({ min: 1, max: 5000 })
    .withMessage('Response must be between 1 and 5000 characters'),
    
  page: param('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),
    
  limit: param('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
};

// Validation middleware
const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    // Log validation errors
    logger.warn('Validation failed', { errors: errors.array() });

    return res.status(400).json({
      success: false,
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg,
        value: err.value,
      })),
    });
  };
};

// Validate MongoDB ObjectId
const validateObjectId = (paramName) => {
  return [
    param(paramName)
      .custom((value) => {
        if (!ObjectId.isValid(value)) {
          throw new Error('Invalid ID format');
        }
        return true;
      }),
    validate([]),
  ];
};

// Message validation rules
const messageValidation = {
  createMessage: validate([
    // Honeypot validation - if this field is filled, it's likely a bot
    body('website')
      .optional()
      .isEmpty()
      .withMessage('Form submission rejected'),
      
    commonRules.name,
    commonRules.email,
    commonRules.phone,
    commonRules.subject,
    commonRules.message,
  ]),
  
  updateStatus: validate([
    commonRules.status,
  ]),
  
  addResponse: validate([
    commonRules.response,
  ]),
  
  listMessages: validate([
    commonRules.page,
    commonRules.limit,
  ]),
};

module.exports = {
  validate,
  validateObjectId,
  messageValidation,
  commonRules,
};

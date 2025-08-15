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
      
    // Accept either full `name` or both `firstName` and `lastName`
    body('name')
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters'),
    body('firstName')
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('First name must be between 2 and 50 characters'),
    body('lastName')
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Last name must be between 2 and 50 characters'),
    commonRules.email,
    commonRules.phone,
    commonRules.subject,

    // Accept either `message` or `content` with the same length constraints
    body('message')
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ min: 10, max: 5000 })
      .withMessage('Message must be between 10 and 5000 characters'),
    body('content')
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ min: 10, max: 5000 })
      .withMessage('Content must be between 10 and 5000 characters'),

    // Require at least one of message or content
    body()
      .custom((_, { req }) => {
        const msg = (req.body.message || '').trim();
        const cnt = (req.body.content || '').trim();
        if (!msg && !cnt) {
          throw new Error('Either message or content is required');
        }
        return true;
      }),

    // Require either full name or both first and last names
    body()
      .custom((_, { req }) => {
        const hasFullName = !!(req.body.name && String(req.body.name).trim().length >= 2);
        const hasFirst = !!(req.body.firstName && String(req.body.firstName).trim().length >= 2);
        const hasLast = !!(req.body.lastName && String(req.body.lastName).trim().length >= 2);
        if (!(hasFullName || (hasFirst && hasLast))) {
          throw new Error('Provide either name or both firstName and lastName');
        }
        return true;
      }),
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

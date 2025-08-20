import { body, param, validationResult } from 'express-validator';
import { Types } from 'mongoose';
import logger from '../utils/logger.js';

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
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .notEmpty()
    .withMessage('Email is required'),
    
  phone: body('phone')
    .trim()
    .optional({ checkFalsy: true })
    .matches(/^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/)
    .withMessage('Please provide a valid phone number'),
    
  message: body('message')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Message must be between 10 and 2000 characters')
    .notEmpty()
    .withMessage('Message is required'),
    
  subject: body('subject')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Subject must be between 2 and 100 characters')
    .notEmpty()
    .withMessage('Subject is required'),
    
  // Honeypot field - should always be empty
  honeypot: body('honeypot')
    .optional()
    .trim()
    .isEmpty()
    .withMessage('Form submission rejected')
};

/**
 * Validation middleware
 * @param {Array} validations - Array of validation rules
 * @returns {Function} Express middleware
 */
const validate = (validations) => {
  return async (req, res, next) => {
    // Run all validations
    await Promise.all(validations.map(validation => validation.run(req)));

    // Check for validation errors
    const errors = validationResult(req);
    
    if (errors.isEmpty()) {
      return next();
    }

    // Log validation errors
    logger.warn('Validation failed', {
      errors: errors.array(),
      url: req.originalUrl,
      method: req.method,
      body: req.body,
      params: req.params,
      query: req.query
    });

    // Return validation errors
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  };
};

/**
 * Validate MongoDB ObjectId
 * @param {string} paramName - Name of the parameter to validate
 * @returns {Function} Express middleware
 */
const validateObjectId = (paramName) => {
  return (req, res, next) => {
    const id = req.params[paramName];
    
    if (!Types.ObjectId.isValid(id)) {
      logger.warn(`Invalid ObjectId: ${id}`);
      return res.status(400).json({
        success: false,
        error: `Invalid ${paramName} format`
      });
    }
    
    next();
  };
};

// Message validation rules
const messageValidation = {
  createMessage: validate([
    // Honeypot validation - if this field is filled, it's likely a bot
    commonRules.honeypot,
    
    // Required fields
    commonRules.firstName,
    commonRules.lastName,
    commonRules.email,
    commonRules.phone,
    commonRules.subject,
    commonRules.message,
    
    // Additional message-specific validations
    body('privacyPolicyAccepted')
      .isBoolean()
      .withMessage('You must accept the privacy policy')
      .toBoolean()
      .isBoolean()
      .withMessage('Invalid privacy policy acceptance value')
      .custom((value) => value === true)
      .withMessage('You must accept the privacy policy'),
      
    body('marketingConsent')
      .optional()
      .isBoolean()
      .withMessage('Invalid marketing consent value')
      .toBoolean()
  ]),
  
  updateMessage: validate([
    body('status')
      .optional()
      .isIn(['new', 'in_progress', 'resolved', 'spam'])
      .withMessage('Invalid status value'),
      
    body('priority')
      .optional()
      .isIn(['low', 'medium', 'high', 'urgent'])
      .withMessage('Invalid priority value'),
      
    body('assignedTo')
      .optional()
      .isMongoId()
      .withMessage('Invalid user ID'),
      
    body('tags')
      .optional()
      .isArray()
      .withMessage('Tags must be an array'),
      
    body('tags.*')
      .isString()
      .withMessage('Each tag must be a string')
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Each tag must be between 1 and 50 characters')
  ]),
  
  addResponse: validate([
    body('content')
      .trim()
      .isLength({ min: 1, max: 5000 })
      .withMessage('Response must be between 1 and 5000 characters')
      .notEmpty()
      .withMessage('Response content is required'),
      
    body('isInternalNote')
      .optional()
      .isBoolean()
      .withMessage('isInternalNote must be a boolean value')
  ])
};

export {
  validate,
  validateObjectId,
  commonRules,
  messageValidation
};

export default {
  validate,
  validateObjectId,
  commonRules,
  messageValidation
};

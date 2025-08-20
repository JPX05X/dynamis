import Joi from 'joi';

/**
 * Validate contact form data
 * @param {Object} data - The data to validate
 * @returns {Joi.ValidationResult} Validation result
 */
function validateContactForm(data) {
  const schema = Joi.object({
    firstName: Joi.string()
      .trim()
      .min(2)
      .max(50)
      .required()
      .label('First Name'),
      
    lastName: Joi.string()
      .trim()
      .min(2)
      .max(50)
      .required()
      .label('Last Name'),
      
    email: Joi.string()
      .trim()
      .email({ minDomainSegments: 2, tlds: { allow: false } })
      .required()
      .label('Email Address'),
      
    phone: Joi.string()
      .trim()
      .pattern(/^[\d\s\-+()]*$/)
      .allow('')
      .optional()
      .label('Phone Number'),
      
    subject: Joi.string()
      .trim()
      .min(2)
      .max(100)
      .required()
      .label('Subject'),
      
    message: Joi.string()
      .trim()
      .min(10)
      .max(2000)
      .required()
      .label('Message'),
      
    // Honeypot field - should be empty
    website: Joi.string()
      .trim()
      .allow('')
      .optional(),
      
    // Additional fields that might be present but not required
    _csrf: Joi.string().optional(),
    privacyPolicyAccepted: Joi.boolean()
      .truthy('true', '1', 'on', 'yes')
      .valid(true)
      .required()
      .messages({
        'any.required': 'You must accept the privacy policy',
        'any.only': 'You must accept the privacy policy'
      }),
    marketingConsent: Joi.boolean().optional(),
    
    // Allow any other fields
  }).unknown(true);
  
  return schema.validate(data, { 
    abortEarly: false,
    stripUnknown: true,
    allowUnknown: true
  });
}

export { validateContactForm };

export default {
  validateContactForm
};

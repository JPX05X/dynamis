import Joi from 'joi';

export const contactFormSchema = Joi.object({
  firstName: Joi.string().required().min(2).max(50)
    .messages({
      'string.empty': 'First name is required',
      'string.min': 'First name must be at least {#limit} characters',
      'string.max': 'First name must not exceed {#limit} characters'
    }),
  lastName: Joi.string().allow('').max(50)
    .messages({
      'string.max': 'Last name must not exceed {#limit} characters'
    }),
  email: Joi.string().email().required()
    .messages({
      'string.email': 'Please enter a valid email address',
      'string.empty': 'Email is required'
    }),
  phone: Joi.string().pattern(/^[+]?[\s\d-]{6,20}$/)
    .messages({
      'string.pattern.base': 'Please enter a valid phone number'
    }),
  message: Joi.string().required().min(10).max(2000)
    .messages({
      'string.empty': 'Message is required',
      'string.min': 'Message must be at least {#limit} characters',
      'string.max': 'Message must not exceed {#limit} characters'
    }),
  // Honeypot field
  website: Joi.string().allow('').max(0)
    .messages({
      'string.max': 'Invalid form submission'
    })
});

export const validateContactForm = (data) => {
  return contactFormSchema.validate(data, { 
    abortEarly: false,
    allowUnknown: true,
    stripUnknown: true
  });
};

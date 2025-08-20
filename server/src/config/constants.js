/**
 * Application-wide constants
 */

export const MESSAGE_STATUS = {
  // Initial status when a message is first created
  NEW: 'new',
  // When a team member starts working on the message
  IN_PROGRESS: 'in_progress',
  // When the message has been addressed
  RESOLVED: 'resolved',
  // When a resolved message is reopened
  REOPENED: 'reopened',
  // When a message is marked as spam
  SPAM: 'spam',
  // When a message is deleted
  DELETED: 'deleted'
};

// Default pagination settings
export const PAGINATION = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  DEFAULT_PAGE: 1
};

// Rate limiting configuration
export const RATE_LIMIT = {
  WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  MAX_REQUESTS: 100 // limit each IP to 100 requests per windowMs
};

// Validation constants
export const VALIDATION = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^[\+\d\s\-\(\)]+$/, // Basic phone number validation
  URL: /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w- .\/?%&=]*)?$/
};

// Security constants
export const SECURITY = {
  // Default session expiration (24 hours)
  SESSION_EXPIRY: 24 * 60 * 60 * 1000,
  // Password requirements
  PASSWORD: {
    MIN_LENGTH: 8,
    REQUIRE_NUMBER: true,
    REQUIRE_SYMBOL: true,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true
  }
};

// File upload configuration
export const UPLOAD = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_MIME_TYPES: [
    'image/jpeg',
    'image/png',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
};

// Default response messages
export const MESSAGES = {
  NOT_FOUND: 'The requested resource was not found',
  UNAUTHORIZED: 'Authentication required',
  FORBIDDEN: 'You do not have permission to perform this action',
  INVALID_CREDENTIALS: 'Invalid email or password',
  ACCOUNT_LOCKED: 'Account is temporarily locked due to too many failed login attempts',
  TOKEN_EXPIRED: 'Your session has expired. Please log in again',
  RATE_LIMIT_EXCEEDED: 'Too many requests, please try again later',
  INTERNAL_SERVER_ERROR: 'An unexpected error occurred. Please try again later',
  VALIDATION_ERROR: 'Validation failed',
  INVALID_INPUT: 'Invalid input provided'
};

// Default error codes
export const ERROR_CODES = {
  // 4xx Client Errors
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  PAYMENT_REQUIRED: 'PAYMENT_REQUIRED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  METHOD_NOT_ALLOWED: 'METHOD_NOT_ALLOWED',
  NOT_ACCEPTABLE: 'NOT_ACCEPTABLE',
  REQUEST_TIMEOUT: 'REQUEST_TIMEOUT',
  CONFLICT: 'CONFLICT',
  GONE: 'GONE',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
  
  // Validation Errors (422)
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_EMAIL: 'INVALID_EMAIL',
  INVALID_PHONE: 'INVALID_PHONE',
  INVALID_URL: 'INVALID_URL',
  REQUIRED_FIELD: 'REQUIRED_FIELD',
  INVALID_LENGTH: 'INVALID_LENGTH',
  INVALID_FORMAT: 'INVALID_FORMAT',
  
  // 5xx Server Errors
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  NOT_IMPLEMENTED: 'NOT_IMPLEMENTED',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  GATEWAY_TIMEOUT: 'GATEWAY_TIMEOUT',
  
  // Database Errors
  DATABASE_ERROR: 'DATABASE_ERROR',
  DUPLICATE_KEY: 'DUPLICATE_KEY',
  CONSTRAINT_VIOLATION: 'CONSTRAINT_VIOLATION',
  
  // Authentication & Authorization
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  INVALID_REFRESH_TOKEN: 'INVALID_REFRESH_TOKEN',
  
  // File Upload
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  UNSUPPORTED_FILE_TYPE: 'UNSUPPORTED_FILE_TYPE',
  UPLOAD_FAILED: 'UPLOAD_FAILED',
  
  // Rate Limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED'
};

// Export all constants as default
export default {
  MESSAGE_STATUS,
  PAGINATION,
  RATE_LIMIT,
  VALIDATION,
  SECURITY,
  UPLOAD,
  MESSAGES,
  ERROR_CODES
};

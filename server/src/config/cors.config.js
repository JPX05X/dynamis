const config = require('../../config/config');
const logger = require('../utils/logger');

// Enhanced CORS configuration with logging
const corsOptions = {
  /**
   * Configure the CORS middleware
   * @param {string|Array<string>|Function} origin - The origin(s) to allow
   * @param {Function} callback - Callback function
   */
  origin: function (origin, callback) {
    // Log all CORS requests for debugging
    const requestInfo = {
      origin,
      method: this.req?.method,
      path: this.req?.originalUrl,
      headers: this.req?.headers,
    };

    // Allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin) {
      logger.cors('Request with no origin', { ...requestInfo, action: 'allowed' });
      return callback(null, true);
    }
    
    // Allow all origins in development with a warning
    if (config.nodeEnv === 'development') {
      logger.cors('Development mode - allowing all origins', { ...requestInfo, action: 'allowed' });
      return callback(null, true);
    }
    
    // Check if the origin is in the allowed origins list
    if (config.cors.allowedOrigins.includes('*')) {
      logger.cors('All origins allowed (*)', { ...requestInfo, action: 'allowed' });
      return callback(null, true);
    }
    
    if (config.cors.allowedOrigins.includes(origin)) {
      logger.cors('Origin allowed', { ...requestInfo, action: 'allowed' });
      return callback(null, true);
    }
    
    // Log blocked CORS attempts
    const error = new Error(`CORS not allowed for origin: ${origin}`);
    error.status = 403;
    
    logger.cors('CORS request blocked', { 
      ...requestInfo, 
      action: 'blocked',
      allowedOrigins: config.cors.allowedOrigins,
      error: error.message 
    });
    
    return callback(error, false);
  },
  
  // Allow credentials (cookies, authorization headers, etc.)
  credentials: config.cors.credentials,
  
  // Allowed HTTP methods
  methods: config.cors.methods,
  
  // Allowed headers
  allowedHeaders: config.cors.allowedHeaders,
  
  // Exposed headers
  exposedHeaders: config.cors.exposedHeaders,
  
  // Max age of the preflight request in seconds
  maxAge: config.cors.maxAge,
  
  // Set to true to pass the CORS preflight response to the next handler
  preflightContinue: false,
  
  // Provide a status code to use for successful OPTIONS requests
  optionsSuccessStatus: 204
};

module.exports = corsOptions;

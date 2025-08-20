/**
 * Custom error classes for the application
 */

class AppError extends Error {
  constructor(message, statusCode, code, details = []) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode || 500;
    this.code = code || 'INTERNAL_SERVER_ERROR';
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details.length ? this.details : undefined,
        stack: process.env.NODE_ENV === 'development' ? this.stack : undefined
      }
    };
  }
}

class BadRequestError extends AppError {
  constructor(message = 'Bad Request', details = []) {
    super(message, 400, 'BAD_REQUEST', details);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', details = []) {
    super(message, 401, 'UNAUTHORIZED', details);
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', details = []) {
    super(message, 403, 'FORBIDDEN', details);
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Not Found', details = []) {
    super(message, 404, 'NOT_FOUND', details);
  }
}

class ConflictError extends AppError {
  constructor(message = 'Conflict', details = []) {
    super(message, 409, 'CONFLICT', details);
  }
}

class ValidationError extends AppError {
  constructor(message = 'Validation Error', details = []) {
    super(message, 422, 'VALIDATION_ERROR', details);
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Too Many Requests', details = []) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED', details);
  }
}

class DatabaseError extends AppError {
  constructor(message = 'Database Error', details = []) {
    super(message, 500, 'DATABASE_ERROR', details);
  }
}

class ServiceUnavailableError extends AppError {
  constructor(message = 'Service Unavailable', details = []) {
    super(message, 503, 'SERVICE_UNAVAILABLE', details);
  }
}

// Error handling middleware
export const errorHandler = (err, req, res, next) => {
  // Default to 500 if status code is not set
  const statusCode = err.statusCode || 500;
  
  // Log the error for debugging
  console.error(`[${new Date().toISOString()}] ${err.stack || err}`);
  
  // Send error response
  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: err.message || 'Internal Server Error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
      ...(err.details && { details: err.details })
    },
    requestId: req.id
  });
};

// 404 handler
export const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Cannot ${req.method} ${req.path}`
    },
    requestId: req.id
  });
};

export {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  RateLimitError,
  DatabaseError,
  ServiceUnavailableError
};

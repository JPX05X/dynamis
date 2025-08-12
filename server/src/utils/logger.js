const winston = require('winston');
const path = require('path');
const fs = require('fs');
const config = require('../../config/config');
const { createLogger, format, transports } = winston;
const { combine, timestamp, printf, colorize, json, errors } = format;

// Ensure logs directory exists
const logDir = 'logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Custom log levels
const logLevels = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
    cors: 5,
    ratelimit: 5,
  },
  colors: {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'white',
    cors: 'cyan',
    ratelimit: 'orange',
  }
};

// Add colors to winston
winston.addColors(logLevels.colors);

// Custom format for console output
const consoleFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  let log = `${timestamp} [${level}]: ${message}`;
  
  // Add stack trace if available
  if (stack) {
    log += `\n${stack}`;
  }
  
  // Add metadata if present
  if (Object.keys(meta).length > 0) {
    log += `\n${JSON.stringify(meta, null, 2)}`;
  }
  
  return log;
});

// Base format for all logs
const baseFormat = combine(
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  errors({ stack: true }),
  json()
);

// Console transport format
const consoleTransportFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  consoleFormat
);

// Create transports
const loggerTransports = [
  // Console transport for all levels in development, only errors in production
  new transports.Console({
    format: consoleTransportFormat,
    level: process.env.NODE_ENV === 'development' ? 'debug' : 'info'
  }),
  
  // Error logs
  new transports.File({
    filename: `${logDir}/error.log`,
    level: 'error',
    maxsize: 10485760, // 10MB
    maxFiles: 7, // Keep 7 days of logs
  }),
  
  // CORS specific logs
  new transports.File({
    filename: `${logDir}/cors.log`,
    level: 'cors',
    format: baseFormat,
    maxsize: 10485760,
    maxFiles: 7,
  }),
  
  // Rate limiting specific logs
  new transports.File({
    filename: `${logDir}/ratelimit.log`,
    level: 'ratelimit',
    format: baseFormat,
    maxsize: 10485760,
    maxFiles: 7,
  }),
  
  // Combined logs (all levels)
  new transports.File({
    filename: `${logDir}/combined.log`,
    format: baseFormat,
    maxsize: 10485760,
    maxFiles: 7,
  })
];

// Create the logger instance
const logger = createLogger({
  levels: logLevels.levels,
  level: 'debug',
  format: baseFormat,
  transports: loggerTransports,
  exitOnError: false, // Don't exit on handled exceptions
});

// Add a stream for morgan HTTP request logging
logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

// Custom logger methods for CORS and rate limiting
logger.cors = (message, meta = {}) => {
  logger.log('cors', message, meta);
};

logger.ratelimit = (message, meta = {}) => {
  logger.log('ratelimit', message, meta);
};

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
  // Don't exit in development to allow for debugging
  if (process.env.NODE_ENV !== 'development') {
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { promise, reason });
});

module.exports = logger;

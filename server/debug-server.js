// Enable debug logging for all namespaces
process.env.DEBUG = 'express:*';
process.env.DEBUG_COLORS = 'true';
process.env.DEBUG_FD = '1';

// Load environment variables first
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const util = require('util');
const debug = require('debug')('server:debug');
const app = require('./src/app');
const config = require('./config/config');

// Create logs directory if it doesn't exist
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Create a write stream (in append mode)
const accessLogStream = fs.createWriteStream(
  path.join(logDir, 'access.log'), 
  { flags: 'a' }
);

// Override console.log to also write to file
const originalConsoleLog = console.log;
console.log = function(...args) {
  const message = util.format(...args);
  accessLogStream.write(`${new Date().toISOString()} [LOG] ${message}\n`);
  originalConsoleLog.apply(console, args);
};

// Override console.error
const originalConsoleError = console.error;
console.error = function(...args) {
  const message = util.format(...args);
  accessLogStream.write(`${new Date().toISOString()} [ERROR] ${message}\n`);
  originalConsoleError.apply(console, args);
};

// Error handling for uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  // Close server gracefully
  if (server) {
    server.close(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

// Error handling for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start the server
const port = config.port || 3000;
const server = app.listen(port, () => {
  console.log(`Server is running in ${process.env.NODE_ENV || 'development'} mode`);
  console.log(`Server listening on port ${port}`);
  console.log('Environment variables:', {
    NODE_ENV: process.env.NODE_ENV,
    MONGODB_URI: process.env.MONGODB_URI ? '***' : 'Not set',
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN ? '***' : 'Not set',
    TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID ? '***' : 'Not set',
  });
  
  // Test database connection
  const mongoose = require('mongoose');
  mongoose.connection.on('connected', () => {
    console.log('MongoDB connected successfully');
  });
  
  mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
  });
});

// Handle server errors
server.on('error', (error) => {
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = typeof port === 'string' ? `Pipe ${port}` : `Port ${port}`;

  switch (error.code) {
    case 'EACCES':
      console.error(`${bind} requires elevated privileges`);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(`${bind} is already in use`);
      process.exit(1);
      break;
    default:
      throw error;
  }
});

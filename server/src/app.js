const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const config = require('../config/config');
const logger = require('./utils/logger');
const connectDB = require('./utils/db');

// Import routes
const messageRoutes = require('./routes/message.routes');
const healthRoutes = require('./routes/health.routes');

// Import rate limiters
const { apiLimiter, authLimiter, messageLimiter } = require('./middleware/rateLimiter');

// Initialize Express app
const app = express();

// Connect to MongoDB
connectDB();

// Trust proxy (important if behind a reverse proxy like Nginx)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// CORS configuration and middleware
const corsOptions = require('./config/cors.config');
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Handle preflight requests for all routes

// Log CORS errors
app.use((err, req, res, next) => {
  if (err) {
    logger.error(`CORS Error: ${err.message}`, {
      path: req.path,
      method: req.method,
      origin: req.headers.origin,
      ip: req.ip,
      headers: req.headers,
    });
    
    if (err.status === 403) {
      return res.status(403).json({
        success: false,
        message: 'Not allowed by CORS',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  }
  next(err);
});

// Body parser middleware
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Request logging
app.use(morgan('combined', { 
  stream: { 
    write: (message) => logger.http(message.trim()) 
  } 
}));

// Log all requests for debugging
app.use((req, res, next) => {
  logger.info(`Request: ${req.method} ${req.originalUrl}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
    referrer: req.get('referrer'),
  });
  next();
});

// Apply rate limiting
app.use(apiLimiter); // Apply to all routes

// Apply more restrictive rate limiting to auth routes
app.use('/api/auth', authLimiter);

// Health check routes (no rate limiting)
app.use('/health', healthRoutes);

// Apply rate limiting to message routes
app.use('/api/messages', messageLimiter, messageRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});


// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  // Set static folder
  app.use(express.static(path.join(__dirname, '../../dist')));
  
  // Handle SPA (Single Page Application) routing
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../../dist', 'index.html'));
  });
}

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Resource not found',
  });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error(`Global error handler: ${err.stack}`);
  
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

module.exports = app;

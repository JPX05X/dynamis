import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Get __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load configuration
import config from './config.js';
import logger from './utils/logger.js';
import formController from './controllers/form.controller.js';
import { connectDB, checkHealth } from './utils/db.js';

// Initialize Express app
const app = express();

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Security middleware
app.use(helmet());

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // List of allowed origins
    const allowedOrigins = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3001',
      'http://localhost:5500',  // Common port for Live Server
      'http://127.0.0.1:5500',  // Common port for Live Server
      'http://127.0.0.1:5501',  // Another common port for Live Server
      'http://localhost:5501',  // Another common port for Live Server
      'file://',                // For local file access
      'https://dynamis-*.vercel.app', // Vercel preview URLs
      'https://dynamis-three.vercel.app' // Production URL
    ];
    
    // Allow any origin in development
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    // In production, only allow specific origins
    if (allowedOrigins.includes(origin) || origin.endsWith('.yourdomain.com')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 200 // Some legacy browsers (IE11, various SmartTVs) choke on 204
};

app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX,
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Request logging
app.use(morgan('combined', { stream: logger.stream }));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.post('/api/messages', formController.submitForm);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: config.NODE_ENV
  });
});

// Serve static files from the root directory
app.use(express.static(path.join(__dirname, '../..')));

// Serve home.html at the root path
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../index.html'));
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Not Found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    body: req.body
  });

  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    ...(config.NODE_ENV === 'development' && { error: err.message })
  });
});

// Health check endpoint that verifies database connection
app.get('/health', async (req, res) => {
  const dbHealth = await checkHealth();
  const status = dbHealth.status === 'up' ? 200 : 503;
  
  return res.status(status).json({
    status: dbHealth.status,
    message: dbHealth.message,
    timestamp: new Date().toISOString(),
    environment: config.NODE_ENV,
    ...(config.NODE_ENV === 'development' && { details: dbHealth.stats })
  });
});

// Start server with database connection
const startServer = async () => {
  try {
    // Connect to database
    await connectDB();
    
    // Start listening
    const server = app.listen(config.PORT, () => {
      logger.info(`Server running in ${config.NODE_ENV} mode on port ${config.PORT}`);
      logger.info(`Form submission endpoint: http://localhost:${config.PORT}/api/messages`);
      logger.info(`Health check: http://localhost:${config.PORT}/health`);
    });
    
    return server;
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
const server = await startServer();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('UNHANDLED REJECTION! 💥 Shutting down...', err);
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION! 💥', err);
  process.exit(1);
});

// Handle SIGTERM
process.on('SIGTERM', () => {
  logger.info('👋 SIGTERM RECEIVED. Shutting down gracefully');
  server.close(() => {
    logger.info('💥 Process terminated!');
  });
});

export default server;

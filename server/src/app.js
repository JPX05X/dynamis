import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import config from '../config/config.js';
import logger from './utils/logger.js';
import session from './config/session.config.js';
import { csrfTokenMiddleware, csrfProtection } from './middleware/security.middleware.js';

// ES Modules compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import routes
import messageRoutes from './routes/message.routes.js';
import healthRoutes from './routes/health.routes.js';
import csrfRoutes from './routes/csrf.routes.js';

// Rate limiting is handled at the route level

// Initialize Express app
const app = express();

// Database connection is initialized by the bootstrap (server.js)

// Trust proxy (important if behind a reverse proxy like Nginx)
app.set('trust proxy', 1);

// Session middleware (must come before CSRF)
app.use(session);

// CSRF token middleware (must come after session middleware)
app.use(csrfTokenMiddleware);

// Apply CSRF protection to all non-GET routes except /api/csrf-token
app.use((req, res, next) => {
  // Skip CSRF for CSRF token endpoint and GET/HEAD/OPTIONS requests
  if (req.path === '/api/csrf-token' || ['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  csrfProtection(req, res, next);
});

// Security middleware
app.use(helmet());

// Enable CORS for all routes
const corsOptions = {
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Parse allowed origins from environment variable or use defaults
    let allowedOrigins = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:8000',
      'http://127.0.0.1:8000'
    ];
    
    // Add any additional origins from environment variable
    if (process.env.ALLOWED_ORIGINS) {
      allowedOrigins = [
        ...allowedOrigins,
        ...process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
      ];
    }
    
    // Check if the origin is in the allowed origins
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-CSRF-Token', 
    'X-Requested-With',
    'X-XSRF-TOKEN',
    'XSRF-TOKEN',
    'Access-Control-Allow-Origin',
    'Access-Control-Allow-Headers',
    'Access-Control-Allow-Methods'
  ],
  exposedHeaders: [
    'Content-Length', 
    'X-CSRF-Token',
    'X-XSRF-TOKEN',
    'XSRF-TOKEN'
  ],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Apply CORS to all routes
app.use(cors(corsOptions));

// Handle preflight requests for all routes
app.options('*', cors(corsOptions));

// Request logging
if (config.nodeEnv !== 'test') {
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.http(message.trim())
    }
  }));
}

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use(express.static(path.join(__dirname, '../public')));

// Rate limiting is applied at the route level for better control

// API routes
app.use(`${config.api.prefix}/health`, healthRoutes);
app.use(`${config.api.prefix}/messages`, messageRoutes);
app.use(`${config.api.prefix}`, csrfRoutes);

// Serve API documentation
app.use(`${config.api.docsPath}`, express.static(path.join(__dirname, '../docs')));

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.path}`
  });});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(`Error: ${err.message}`, {
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query
  });

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

export default app;

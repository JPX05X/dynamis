import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { securityHeaders, apiLimiter, formLimiter, csrfProtection, errorHandler } from '../middleware/security.middleware';
import { logger } from './logger';
import { connectDB } from './database';

const app = express();

// Security middleware
app.use(securityHeaders);

// Trust first proxy (important if behind a reverse proxy like Nginx)
app.set('trust proxy', 1);

// Body parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? ['https://yourdomain.com']
    : ['http://localhost:3000', 'http://localhost:3001'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Static files
app.use(express.static('public'));

// API Routes
app.get('/api/csrf-token', (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// Apply rate limiting
app.use('/api', apiLimiter);
app.use('/api/contact', formLimiter);

// Apply CSRF protection to all POST/PUT/DELETE routes
export const protectedRoutes = ['/api/contact', '/api/messages'];
protectedRoutes.forEach(route => {
  app.post(route, csrfProtection);
  app.put(route, csrfProtection);
  app.delete(route, csrfProtection);
});

// Import routes
import messageRoutes from '../routes/message.routes';

// Use routes
app.use('/api/messages', messageRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Not Found',
    path: req.path,
  });
});

// Global error handler
app.use(errorHandler);

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  // Close server & exit process
  // server.close(() => process.exit(1));
});

export { app };

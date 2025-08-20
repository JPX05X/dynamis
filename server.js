// Load environment variables first
import dotenv from 'dotenv';
dotenv.config({ path: process.env.ENV_PATH || '.env' });

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';

// Import database connection
import db from './server/src/utils/db.js';

// Import routes
import messageRoutes from './server/src/routes/message.routes.js';
import csrfRoutes from './server/src/routes/csrf.routes.js';
import session from './server/src/config/session.config.js';

// ES Modules compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Environment variables
const PORT = process.env.PORT || 3001; // Default to 3001 if PORT is not set in env
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
// Env flag used for CSP and CORS
const isProduction = process.env.NODE_ENV === 'production';

// Security middleware
app.use(helmet());

// Development CSP to allow external assets and inline scripts/styles
if (!isProduction) {
  app.use(
    helmet.contentSecurityPolicy({
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://use.typekit.net',
          'http://use.typekit.net',
          'https://p.typekit.net'
        ],
        scriptSrcElem: [
          "'self'",
          "'unsafe-inline'",
          'https://use.typekit.net',
          'http://use.typekit.net',
          'https://p.typekit.net'
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://use.typekit.net',
          'https://cdnjs.cloudflare.com',
          'https://fonts.googleapis.com'
        ],
        styleSrcElem: [
          "'self'",
          "'unsafe-inline'",
          'https://use.typekit.net',
          'https://cdnjs.cloudflare.com',
          'https://fonts.googleapis.com'
        ],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: [
          "'self'",
          'https://use.typekit.net',
          'http://use.typekit.net',
          'https://fonts.gstatic.com',
          'https://cdnjs.cloudflare.com',
          'data:'
        ],
        frameSrc: ['https://www.google.com', 'https://www.gstatic.com'],
        // Allow inline event handlers and style attributes in development
        scriptSrcAttr: ["'unsafe-inline'", "'unsafe-hashes'"],
        styleSrcAttr: ["'unsafe-inline'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: null
      }
    })
  );
} else {
  // Production CSP: strict, but allow necessary external resources (no inline)
  app.use(
    helmet.contentSecurityPolicy({
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          'https://use.typekit.net',
          'https://p.typekit.net'
        ],
        scriptSrcElem: [
          "'self'",
          'https://use.typekit.net',
          'https://p.typekit.net'
        ],
        styleSrc: [
          "'self'",
          'https://use.typekit.net',
          'https://fonts.googleapis.com'
        ],
        styleSrcElem: [
          "'self'",
          'https://use.typekit.net',
          'https://fonts.googleapis.com'
        ],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: [
          "'self'",
          'https://use.typekit.net',
          'https://fonts.gstatic.com',
          'data:'
        ],
        frameSrc: ['https://www.google.com', 'https://www.gstatic.com'],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: []
      }
    })
  );
}

// CORS configuration - more permissive in development
const allowedOrigins = isProduction 
  ? [
      'https://dynamis-production.up.railway.app',
      'https://dynamis.vercel.app',
      'https://dynamis-llp.vercel.app',
      'https://dynamis-29che4hwt-jpxxxs-projects.vercel.app',
      'https://dynamis-git-main-jpxxxs-projects.vercel.app',
      'https://dynamis-jpxxxs-projects.vercel.app'
    ]
  : [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:8000',
      'http://127.0.0.1:8000',
      'http://localhost:8080',
      'http://127.0.0.1:8080'
    ];

// Helper to decide if an origin is allowed
function isOriginAllowed(origin) {
  try {
    if (!origin) return true; // non-browser or same-origin without Origin header

    // Always allow explicit allowlist
    if (allowedOrigins.includes(origin)) return true;

    const u = new URL(origin);

    // Allow any vercel.app host (preview/prod URLs rotate)
    if (u.hostname.endsWith('.vercel.app')) return true;

    // Allow same-origin requests (host header may differ by protocol); rely on self
    // If running on Vercel, VERCEL_URL provides the host
    const vercelHost = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null;
    if (vercelHost && origin === vercelHost) return true;

    return false;
  } catch {
    return false;
  }
}

// CORS middleware
app.use(cors({
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
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
  ]
}));

// Preflight handling for all routes
app.options('*', cors({
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
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
  ]
}));

// Request logging
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware (required for CSRF token route)
app.use(session);

// Routes
app.use('/api/messages', messageRoutes);
app.use('/api', csrfRoutes);

// Development static file serving to enable same-origin testing
if (!isProduction) {
  // Serve project root statically so /contact.html and assets are accessible from http://localhost:3001
  app.use(express.static(__dirname));
}

// Health check endpoint (uses DB ping for accuracy)
app.get('/api/health', async (req, res) => {
  try {
    const health = await db.checkHealth();
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: health,
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      error: err.message
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    status: 'error',
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// Start the server
async function startServer() {
  console.log('🚀 Starting server...');
  
  try {
    // Initialize database connection
    console.log('🔌 Connecting to database...');
    await db.connectDB();
    
    const dbConnection = db.connection || mongoose.connection;
    console.log(`✅ Database connection state: ${dbConnection.readyState} (${['disconnected', 'connected', 'connecting', 'disconnecting'][dbConnection.readyState] || 'unknown'})`);
    
    // Start the server
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📡 CORS allowed origins: ${allowedOrigins.join(', ')}`);
    });
    
    // Handle server errors
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use`);
      } else {
        console.error('❌ Server error:', error);
      }
      process.exit(1);
    });
    
    // Handle process termination
    const gracefulShutdown = async () => {
      console.log('\n🚨 Shutting down gracefully...');
      
      try {
        // Close the server
        server.close(() => {
          console.log('👋 HTTP server closed');
        });
        
        // Close database connection if it exists
        if (dbConnection && dbConnection.readyState === 1) {
          await dbConnection.close();
          console.log('👋 Database connection closed');
        }
        
        process.exit(0);
      } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    };
    
    // Handle termination signals
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
    
    return server;
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server if not in test environment
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;

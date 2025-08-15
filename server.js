// Load environment variables first
import dotenv from 'dotenv';
dotenv.config({ path: process.env.ENV_PATH || '.env' });

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import axios from 'axios';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';

// ES Modules compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Environment variables
const PORT = process.env.PORT || 3001; // Default to 3001 if PORT is not set in env
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Security middleware
app.use(helmet());

// CORS configuration - more permissive in development
const isProduction = process.env.NODE_ENV === 'production';
const allowedOrigins = isProduction 
  ? [
      'https://dynamis-production.up.railway.app',
      'https://dynamis.vercel.app',
      'https://dynamis-llp.vercel.app'
    ]
  : [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:8080',
      'http://127.0.0.1:8080'
    ];

app.use(cors({
  origin: isProduction 
    ? (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          console.warn(`Blocked request from origin: ${origin}`);
          callback(new Error('Not allowed by CORS'));
        }
      }
    : '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 200
}));

// Parse incoming requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Simple request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Serve static files from the root directory
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname, {
  // Serve static files with proper caching headers and SPA support
  setHeaders: (res, path) => {
    // Set proper caching headers
    if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    } else {
      // Cache static assets for 1 year
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  },
  // Enable dotfiles to be served (like .htaccess, .env, etc.)
  dotfiles: 'ignore',
  // Enable case-sensitive routing
  caseSensitive: true,
  // Enable strict routing
  strict: false,
  // Serve index.html for directories
  index: ['index.html', 'index.htm'],
  // Set max age for cache control
  maxAge: '1y',
  // Handle errors
  fallthrough: true
}));

// Store the mongoose connection instance
let dbConnection = null;

// Update the connection instance when connecting
async function updateDbConnection(connection) {
  dbConnection = connection;
  return connection;
}

// Database connection test endpoint
app.get('/api/db-health', async (req, res) => {
  try {
    // If we don't have a connection instance yet, try to get one
    if (!dbConnection) {
      const { connect, mongoose: dbMongoose } = await import('./server/src/utils/db.js');
      try {
        dbConnection = await connect();
      } catch (err) {
        console.error('Failed to establish database connection:', err);
        return res.status(503).json({
          status: 'error',
          message: 'Database connection not established',
          connectionState: 0
        });
      }
    }

    // Check connection state
    const isConnected = dbConnection.readyState === 1;
    
    if (!isConnected) {
      return res.status(503).json({
        status: 'error',
        message: 'Database not connected',
        connectionState: dbConnection.readyState
      });
    }
    
    // Try to get database stats
    try {
      const db = dbConnection.db;
      if (!db) {
        throw new Error('Database instance not available');
      }
      
      const stats = await db.stats();
      
      res.json({
        status: 'ok',
        message: 'Database connection is healthy',
        details: {
          db: db.databaseName,
          host: dbConnection.host,
          collections: stats.collections || 0,
          dataSize: stats.dataSize,
          storageSize: stats.storageSize,
          connectionState: dbConnection.readyState,
          connectionStatus: 'connected'
        }
      });
    } catch (dbError) {
      console.error('Database stats error:', dbError);
      res.status(200).json({
        status: 'warning',
        message: 'Connected to MongoDB but could not fetch stats',
        connectionState: dbConnection.readyState,
        error: process.env.NODE_ENV === 'development' ? dbError.message : undefined
      });
    }
  } catch (error) {
    console.error('Database health check failed:', error);
    res.status(500).json({
      status: 'error',
      message: 'Database connection failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      connectionState: mongoose.connection?.readyState || 'unknown'
    });
  }
});

// API health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    dbStatus: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// SPA Fallback - Serve index.html for all other GET requests
app.get('*', (req, res, next) => {
  // Skip API routes
  if (req.path.startsWith('/api/')) {
    return next();
  }
  
  // Skip file extensions (let static middleware handle these)
  if (path.extname(req.path).length > 0) {
    return next();
  }
  
  // Default to serving index.html for SPA routing
  res.sendFile(path.join(__dirname, 'index.html'), (err) => {
    if (err) {
      console.error('Error serving index.html:', err);
      next(err);
    }
  });
});

// API routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Handle form submissions
app.post('/api/messages', async (req, res) => {
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Raw body:', req.body);
  console.log('Parsed body:', JSON.stringify(req.body, null, 2));
  
  try {
    // Basic validation
    if (req.body.website) {
      // Honeypot field was filled (likely a bot)
      console.log('Bot detected - honeypot triggered');
      return res.status(200).json({ success: true }); // Don't let bots know they were detected
    }

    const { name, email, phone, subject, message } = req.body;
    
    if (!name || !email || !message) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name, email, and message are required' 
      });
    }

    // Format message for Telegram
    const telegramMessage = `
📧 *New Contact Form Submission* 📧

*Name:* ${name}
*Email:* ${email}
${phone ? `*Phone:* ${phone}\n` : ''}*Subject:* ${subject || 'No Subject'}

*Message:*
${message}

*Time:* ${new Date().toLocaleString()}
*IP:* ${req.ip}
`;

    // Enforce Telegram delivery based on environment
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      const msg = 'Telegram not configured: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID missing';
      if (isProduction) {
        console.error(msg);
        return res.status(500).json({ success: false, message: 'Message delivery failed' });
      } else {
        console.warn(msg + ' (development mode, accepting message without Telegram).');
        return res.status(200).json({ success: true, message: 'Message received (dev, no Telegram)' });
      }
    }

    try {
      const telegramResponse = await axios.post(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          chat_id: TELEGRAM_CHAT_ID,
          text: telegramMessage,
          parse_mode: 'Markdown',
          disable_web_page_preview: true
        }
      );
      console.log('Message sent to Telegram:', telegramResponse.data);
    } catch (tgErr) {
      const errMsg = tgErr.response?.data || tgErr.message;
      if (isProduction) {
        console.error('Telegram send failed (production):', errMsg);
        return res.status(500).json({ success: false, message: 'Message delivery failed' });
      } else {
        console.error('Telegram send failed (development, non-fatal):', errMsg);
      }
    }

    return res.status(200).json({ success: true, message: 'Message sent successfully' });

  } catch (error) {
    console.error('Error processing form submission:', error);
    
    // Log detailed error information
    if (error.response) {
      console.error('Telegram API error response:', {
        status: error.response.status,
        data: error.response.data
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send message',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
  });
});

// Handle 404
app.use((req, res) => {
  console.log(`404 - ${req.method} ${req.originalUrl}`);
  
  // If it's an API request, return JSON
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({
      status: 'error',
      message: 'Not Found',
      path: req.path
    });
  }
  
  // Otherwise, send a simple text response
  res.status(404).send('Not Found');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method
  });

  // Set status code
  const statusCode = err.statusCode || 500;
  
  // Prepare error response
  const errorResponse = {
    status: 'error',
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  };

  // Send response
  res.status(statusCode);
  
  // If it's an API request, return JSON
  if (req.path.startsWith('/api/')) {
    res.json(errorResponse);
  } else {
    // Otherwise, send a simple error page
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Error ${statusCode}</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            h1 { color: #e74c3c; }
            pre { text-align: left; max-width: 800px; margin: 20px auto; padding: 20px; background: #f5f5f5; border-radius: 5px; }
          </style>
        </head>
        <body>
          <h1>Error ${statusCode}</h1>
          <p>${errorResponse.message}</p>
          ${process.env.NODE_ENV === 'development' ? `<pre>${err.stack}</pre>` : ''}
        </body>
      </html>
    `);
  }
});

// Initialize database connection
async function startServer() {
  try {
    // Import mongoose and connect function
    const { connect, mongoose: dbMongoose } = await import('./server/src/utils/db.js');
    
    console.log('🔌 Connecting to database...');
    try {
      // Connect to database and store the connection (if available)
      let connection;
      try {
        connection = await connect();
      } catch (err) {
        console.warn('⚠️ Database connect() failed, continuing without DB for now:', err.message);
      }
      // Fallback to mongoose connection instance even if undefined from connect()
      dbConnection = connection || dbMongoose.connection;
      if (dbConnection && typeof dbConnection.readyState !== 'undefined') {
        console.log('✅ Database connection object acquired (state:', dbConnection.readyState, ')');
        // Best-effort verification without throwing
        try {
          if (dbConnection.readyState !== 1) {
            console.log('🔄 Waiting briefly for database connection...');
            await new Promise((resolve) => {
              const onConnected = () => {
                dbConnection.removeListener('error', onError);
                console.log('✅ Database connected');
                resolve();
              };
              const onError = () => {
                dbConnection.removeListener('connected', onConnected);
                resolve(); // do not block startup
              };
              dbConnection.once('connected', onConnected);
              dbConnection.once('error', onError);
              setTimeout(() => {
                dbConnection.removeListener('connected', onConnected);
                dbConnection.removeListener('error', onError);
                resolve();
              }, 2000);
            });
          }
        } catch {}
      } else {
        console.log('⚠️ No database connection object available; proceeding without DB.');
      }
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      throw error;
    }
    
    // Start server after database connection is established
    console.log('🚀 Starting server...');
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server is running in ${process.env.NODE_ENV || 'development'} mode`);
      console.log(`Server listening on port ${PORT}`);
      console.log(`CORS allowed origins: ${allowedOrigins.join(', ')}`);
      console.log(`Server running at http://localhost:${PORT}`);
      console.log('Database connection status:', mongoose.connection.readyState === 1 ? 'connected' : 'disconnected');
    });
    
    return server;
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server locally (not on Vercel)
let serverRef;
if (!process.env.VERCEL) {
  startServer().then(s => { serverRef = s; }).catch(() => {});
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! Shutting down...');
  console.error(err.name, err.message);
  if (serverRef && serverRef.close) {
    serverRef.close(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  if (serverRef && serverRef.close) {
    serverRef.close(() => process.exit(1));
  } else {
    process.exit(1);
  }
});

// Export a Vercel-compatible handler
export default function handler(req, res) {
  return app(req, res);
}

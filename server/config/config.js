import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// ES Modules compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  // Server configuration
  nodeEnv: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3000,
  
  // Rate limiting configuration
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100, // limit each IP to 100 requests per windowMs
    authWindowMs: 15 * 60 * 1000, // 15 minutes
    authMaxRequests: 10, // limit auth endpoints to 10 requests per windowMs
  },
  
  // Redis configuration
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    ttl: 24 * 60 * 60 // 1 day in seconds
  },
  
  // Session configuration
  session: {
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 1 day in milliseconds
    }
  },
  
  // Database configuration
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/dynamis_messaging',
    options: {
      // Connection options
      useNewUrlParser: true,
      useUnifiedTopology: true,
      
      // Connection pool settings
      maxPoolSize: Number(process.env.MONGODB_POOL_SIZE) || 10,
      minPoolSize: Number(process.env.MONGODB_MIN_POOL_SIZE) || 2,
      maxIdleTimeMS: Number(process.env.MONGODB_MAX_IDLE_TIME_MS) || 30000,
      serverSelectionTimeoutMS: Number(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS) || 5000,
      socketTimeoutMS: Number(process.env.MONGODB_SOCKET_TIMEOUT_MS) || 45000,
      
      // Connection timeout
      connectTimeoutMS: Number(process.env.MONGODB_CONNECT_TIMEOUT_MS) || 10000,
      
      // Authentication
      authSource: process.env.MONGODB_AUTHSOURCE || undefined,
      user: process.env.MONGODB_USER || undefined,
      pass: process.env.MONGODB_PASSWORD || undefined,
      
      // Retry settings
      retryWrites: true,
      retryReads: true,
      
    }
  },
  
  // Security
  security: {
    // JWT settings
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    
    // Password hashing
    saltRounds: 10,
    
    // Rate limiting
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100 // limit each IP to 100 requests per windowMs
    }
  },
  
  // Email configuration
  email: {
    service: process.env.EMAIL_SERVICE || 'gmail',
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER || '',
      pass: process.env.EMAIL_PASSWORD || ''
    },
    from: process.env.EMAIL_FROM || 'noreply@dynamis-llp.com'
  },
  
  // File uploads
  uploads: {
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedFileTypes: [
      'image/jpeg',
      'image/png',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ],
    uploadDir: process.env.UPLOAD_DIR || 'uploads'
  },
  
  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || 'logs/combined.log',
    errorFile: process.env.ERROR_LOG_FILE || 'logs/error.log',
    console: process.env.LOG_CONSOLE !== 'false'
  },
  
  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  },
  
  // API
  api: {
    prefix: '/api',
    version: 'v1',
    docsPath: '/api-docs'
  },
  
  // Session
  session: {
    secret: process.env.SESSION_SECRET || 'your-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }
};

export default config;

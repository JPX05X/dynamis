const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

module.exports = {
  // Server configuration
  nodeEnv: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3000,
  
  // Database configuration
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/dynamis_messaging',
    options: {
      // Connection options
      useNewUrlParser: true,
      useUnifiedTopology: true,
      
      // Connection pool settings
      maxPoolSize: process.env.MONGODB_POOL_SIZE ? parseInt(process.env.MONGODB_POOL_SIZE, 10) : 10,
      minPoolSize: process.env.MONGODB_MIN_POOL_SIZE ? parseInt(process.env.MONGODB_MIN_POOL_SIZE, 10) : 5,
      maxIdleTimeMS: 30000, // Close idle connections after 30 seconds
      waitQueueTimeoutMS: 5000, // Wait 5 seconds before timing out when no connections are available
      
      // Server selection and connection settings
      serverSelectionTimeoutMS: 30000, // Time to wait for server selection
      connectTimeoutMS: 10000, // Time to wait for initial connection
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      
      // Write concern
      w: 'majority',
      wtimeout: 10000, // 10 second write concern timeout
      
      // Retry settings
      retryWrites: true,
      retryReads: true,
      
      // Authentication (if needed)
      auth: process.env.MONGODB_USER && process.env.MONGODB_PASSWORD ? {
        username: process.env.MONGODB_USER,
        password: process.env.MONGODB_PASSWORD,
      } : undefined,
      
      // TLS/SSL options (for production)
      ssl: process.env.MONGODB_SSL === 'true',
      sslValidate: process.env.MONGODB_SSL_VALIDATE !== 'false',
      tlsAllowInvalidCertificates: process.env.MONGODB_ALLOW_INVALID_CERTS === 'true',
      
      // Replica set options (if using replica sets)
      replicaSet: process.env.MONGODB_REPLICA_SET,
      readPreference: process.env.MONGODB_READ_PREFERENCE || 'primary',
      
      // Additional options
      compressors: ['zlib', 'snappy', 'zstd'],
      zlibCompressionLevel: 7,
    },
  },
  
  // Telegram bot configuration
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    chatId: process.env.TELEGRAM_CHAT_ID,
  },
  
  // Rate limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // Limit each IP to 100 requests per windowMs
  },
  
  // CORS configuration
  cors: {
    // List of allowed origins (add your frontend URLs here)
    allowedOrigins: process.env.ALLOWED_ORIGINS 
      ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
      : [
          'http://localhost:3000',
          'http://localhost:8080',
          'http://127.0.0.1:3000',
          'http://127.0.0.1:8080',
          // Add production URLs here
        ],
    // Allow credentials (cookies, authorization headers, etc.)
    credentials: true,
    // Allowed HTTP methods
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    // Allowed headers
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'X-Access-Token',
      'X-Refresh-Token'
    ],
    // Exposed headers
    exposedHeaders: [
      'Content-Length',
      'X-Access-Token',
      'X-Refresh-Token'
    ],
    // Max age of the preflight request in seconds
    maxAge: 86400, // 24 hours
    // Enable CORS for all routes by default
    enableForAllRoutes: true
  },
  
  // JWT configuration (if needed for authentication)
  jwt: {
    secret: process.env.JWT_SECRET || 'your_jwt_secret_key',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  
  // Logging configuration
  logs: {
    level: process.env.LOG_LEVEL || 'debug',
    directory: path.join(__dirname, '../logs'),
  },
};

import mongoose from 'mongoose';
import config from '../../config/config.js';
import logger from './logger.js';

// Set mongoose options
mongoose.set('strictQuery', false);

// MongoDB connection URL and options
const { uri, options } = config.database;

// Connection state tracking
let isConnected = false;
let isConnecting = false;
let connectionRetries = 0;
const MAX_RETRIES = 5;
const RETRY_DELAY = 5000; // 5 seconds

// Track query performance
mongoose.set('debug', (collectionName, method, query, doc) => {
  logger.debug(`Mongoose: ${collectionName}.${method}`, {
    collection: collectionName,
    method,
    query: JSON.stringify(query),
    doc: doc ? JSON.stringify(doc) : undefined
  });
});

// Connection statistics
const stats = {
  connections: 0,
  disconnects: 0,
  errors: 0,
  queries: 0,
  slowQueries: 0
};

// Check if the database connection is healthy
const checkHealth = async () => {
  try {
    if (!isConnected) return { status: 'down', message: 'Not connected to database' };
    
    // Check if we can run a simple command
    const result = await mongoose.connection.db.admin().ping();
    if (result.ok === 1) {
      return { 
        status: 'up', 
        message: 'Database connection is healthy',
        stats: {
          ...stats,
          connectionState: mongoose.connection.readyState,
          dbStats: await mongoose.connection.db.stats().catch(() => null)
        }
      };
    }
    return { status: 'degraded', message: 'Database ping failed' };
  } catch (error) {
    logger.error('Database health check failed:', error);
    return { status: 'down', message: error.message };
  }
};

// Get current connection stats
const getStats = () => ({
  ...stats,
  isConnected,
  connectionState: mongoose.connection.readyState,
  connectionRetries
});

// Connect to MongoDB with retry logic
const connectDB = async (retryCount = 0) => {
  if (isConnected) return mongoose.connection;
  if (isConnecting) return;
  
  isConnecting = true;
  
  try {
    logger.info(`Connecting to MongoDB (attempt ${retryCount + 1} of ${MAX_RETRIES})...`);
    
    await mongoose.connect(uri, options);
    
    isConnected = true;
    connectionRetries = 0;
    logger.info('MongoDB connected successfully');
    
    return mongoose.connection;
  } catch (error) {
    connectionRetries++;
    stats.errors++;
    
    if (connectionRetries < MAX_RETRIES) {
      logger.warn(`MongoDB connection attempt ${retryCount + 1} failed, retrying in ${RETRY_DELAY}ms...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return connectDB(retryCount + 1);
    }
    
    logger.error('MongoDB connection failed after retries:', error);
    throw new Error(`Failed to connect to MongoDB after ${MAX_RETRIES} attempts: ${error.message}`);
  } finally {
    isConnecting = false;
  }
};

// Handle MongoDB connection events
mongoose.connection.on('connected', () => {
  isConnected = true;
  stats.connections++;
  logger.info('Mongoose connected to DB');
});

mongoose.connection.on('error', (err) => {
  stats.errors++;
  logger.error('Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  isConnected = false;
  stats.disconnects++;
  logger.warn('Mongoose disconnected from DB');
  
  // Attempt to reconnect if this wasn't a manual disconnection
  if (!process.exitCode) {
    logger.info('Attempting to reconnect to MongoDB...');
    connectDB().catch(err => 
      logger.error('Failed to reconnect to MongoDB:', err)
    );
  }
});

// Track slow queries
mongoose.connection.on('slow', (info) => {
  stats.slowQueries++;
  logger.warn('Slow query detected:', {
    operation: info.cmd,
    time: info.time,
    collection: info.coll,
    query: JSON.stringify(info.query || {})
  });
});

// Track all queries
mongoose.connection.on('query', (query) => {
  stats.queries++;
  
  // Log slow queries
  if (query && query.duration > 100) { // Log queries slower than 100ms
    stats.slowQueries++;
    logger.debug('Slow query detected:', {
      collection: query.collection,
      operation: query.op,
      query: JSON.stringify(query.condition || {}),
      duration: query.duration,
      plan: query.plan
    });
  }
});

// Handle process termination
const gracefulShutdown = async (msg, callback) => {
  try {
    logger.info(`Mongoose disconnecting through ${msg}...`);
    await mongoose.connection.close();
    logger.info(`Mongoose disconnected through ${msg}`);
    callback();
  } catch (err) {
    logger.error(`Mongoose disconnection error during ${msg}:`, err);
    process.exit(1);
  }
};

// For nodemon restarts
process.once('SIGUSR2', () => {
  gracefulShutdown('nodemon restart', () => {
    process.kill(process.pid, 'SIGUSR2');
  });
});

// For app termination
process.on('SIGINT', () => {
  gracefulShutdown('app termination', () => {
    process.exit(0);
  });
});

// For Heroku app termination
process.on('SIGTERM', () => {
  gracefulShutdown('Heroku app termination', () => {
    process.exit(0);
  });
});

// Export the connection and utility functions
export {
  connectDB as connect,
  mongoose,
  checkHealth,
  getStats
};

export const connection = mongoose.connection;

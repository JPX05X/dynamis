import mongoose from 'mongoose';
import config from '../../config/config.js';
import logger from './logger.js';

// Enable debug logging for mongoose
mongoose.set('debug', (collectionName, method, query, doc) => {
  logger.debug(`Mongoose: ${collectionName}.${method}`, {
    collection: collectionName,
    method,
    query,
    doc
  });
});

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


// Connection statistics
const stats = {
  connections: 0,
  disconnections: 0,
  errors: 0,
  reconnects: 0,
  startTime: new Date()
};

/**
 * Check if the database connection is healthy
 * @returns {Object} Health check result
 */
const checkHealth = () => {
  const state = mongoose.connection.readyState;
  const status = {
    status: state === 1 ? 'connected' : 'disconnected',
    timestamp: new Date(),
    uptime: process.uptime(),
    stats: {
      ...stats,
      currentConnections: mongoose.connections.length,
      readyState: {
        value: state,
        description: ['disconnected', 'connected', 'connecting', 'disconnecting'][state] || 'unknown'
      }
    }
  };

  // Add database stats if connected
  if (state === 1) {
    return mongoose.connection.db.admin().ping()
      .then(() => status)
      .catch(error => ({
        ...status,
        status: 'error',
        error: error.message
      }));
  }

  return Promise.resolve(status);
};

/**
 * Get current connection stats
 * @returns {Object} Connection statistics
 */
const getStats = () => ({
  ...stats,
  uptime: process.uptime(),
  currentConnections: mongoose.connections.length,
  readyState: {
    value: mongoose.connection.readyState,
    description: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState] || 'unknown'
  }
});

/**
 * Connect to MongoDB with retry logic
 * @param {number} retryCount - Current retry attempt
 * @returns {Promise} Resolves when connected
 */
const connectDB = async (retryCount = 0) => {
  if (isConnected) {
    logger.info('Using existing database connection');
    return;
  }

  if (isConnecting) {
    logger.info('Database connection in progress, waiting...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    return connectDB(retryCount);
  }

  isConnecting = true;
  connectionRetries++;

  try {
    logger.info(`Connecting to MongoDB (attempt ${retryCount + 1})...`);
    
    // Get the MongoDB URI and options from config
    const { uri, options } = config.database;
    
    // Log the connection attempt (masking password in logs)
    const safeUri = uri.includes('@') 
      ? uri.replace(/:([^:]*?)@/, ':***@')
      : uri;
    logger.info(`Connecting to MongoDB at: ${safeUri}`);
    
    // Connection options
    const connectionOptions = {
      ...options
    };

    // Connect to MongoDB
    await mongoose.connect(uri, connectionOptions);
    
    isConnected = true;
    isConnecting = false;
    connectionRetries = 0;
    
    logger.info('MongoDB connected successfully');
  } catch (error) {
    isConnecting = false;
    
    if (retryCount < MAX_RETRIES - 1) {
      const delay = RETRY_DELAY * Math.pow(2, retryCount);
      logger.warn(`MongoDB connection failed (attempt ${retryCount + 1}/${MAX_RETRIES}): ${error.message}`);
      logger.info(`Retrying in ${delay / 1000} seconds...`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return connectDB(retryCount + 1);
    } else {
      logger.error('Failed to connect to MongoDB after multiple attempts', { error: error.message });
      throw new Error('Failed to connect to MongoDB');
    }
  }
};

// Handle MongoDB connection events
mongoose.connection.on('connected', () => {
  isConnected = true;
  stats.connections++;
  logger.info(`MongoDB connected to ${mongoose.connection.name}`);
});

mongoose.connection.on('error', (error) => {
  isConnected = false;
  stats.errors++;
  logger.error('MongoDB connection error:', error);
});

mongoose.connection.on('disconnected', () => {
  isConnected = false;
  stats.disconnections++;
  logger.warn('MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  isConnected = true;
  stats.reconnects++;
  logger.info('MongoDB reconnected');
});

/**
 * Handle process termination
 * @param {string} msg - Shutdown message
 * @param {Function} callback - Callback function
 */
const gracefulShutdown = async (msg, callback) => {
  logger.info(`Shutting down: ${msg}`);
  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed through app termination');
    callback();
  } catch (error) {
    logger.error('Error closing MongoDB connection', { error: error.message });
    process.exit(1);
  }
};

// Export the connection and utility functions
const db = {
  connectDB,
  mongoose,
  checkHealth,
  getStats,
  connection: mongoose.connection
};

export const { connection } = mongoose;
export { connectDB, checkHealth, getStats };
export default db;

import session from 'express-session';
import { createClient } from 'redis';
import RedisStore from 'connect-redis';
import config from '../../config/config.js';

// Create Redis client
let redisClient;
let redisStore;

// Only initialize Redis when explicitly enabled or in production
const shouldUseRedis = process.env.NODE_ENV === 'production' || process.env.USE_REDIS === 'true';
if (shouldUseRedis) {
  try {
    redisClient = createClient({
      url: config.redis.url,
      legacyMode: true
    });

    // Initialize Redis store
    redisStore = new RedisStore({
      client: redisClient,
      prefix: 'sess:',
      ttl: config.redis.ttl
    });

    // Connect to Redis
    redisClient.connect().catch((err) => {
      console.warn('⚠️  Redis connection failed; falling back to MemoryStore', err?.message || err);
      redisClient = undefined;
      redisStore = undefined;
    });
  } catch (err) {
    console.warn('⚠️  Redis initialization error; falling back to MemoryStore', err?.message || err);
    redisClient = undefined;
    redisStore = undefined;
  }
}

// Session configuration
const sessionConfig = {
  store: redisStore,
  secret: config.session.secret,
  resave: false,
  saveUninitialized: false,
  name: 'sessionId',
  proxy: true, // Trust the reverse proxy for HTTPS
  cookie: {
    ...config.session.cookie,
    // Override secure based on environment
    secure: process.env.NODE_ENV === 'production',
  }
};

// Development/default: prefer MemoryStore unless Redis is explicitly enabled and connected
if (process.env.NODE_ENV !== 'production') {
  sessionConfig.cookie.secure = false;
  const MemoryStore = session.MemoryStore;
  if (!redisStore) {
    console.warn('⚠️  Using MemoryStore for sessions (development)');
    sessionConfig.store = new MemoryStore();
  }
}

// For testing, use memory store
if (process.env.NODE_ENV === 'test') {
  const MemoryStore = session.MemoryStore;
  sessionConfig.store = new MemoryStore();
  sessionConfig.secret = 'test-secret';
  sessionConfig.cookie.secure = false;
}

export default session(sessionConfig);

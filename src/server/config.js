import dotenv from 'dotenv';

dotenv.config();

const config = {
  // Server
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || 3001,
  
  // Telegram
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
  TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID || '',
  
  // Security
  RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX: process.env.RATE_LIMIT_MAX || 100,
  
  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'debug'
};

// Validate required configuration
const requiredConfig = ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID'];
const missingConfig = requiredConfig.filter(key => !config[key]);

if (missingConfig.length > 0) {
  console.error('Missing required configuration:', missingConfig.join(', '));
  process.exit(1);
}

export default config;

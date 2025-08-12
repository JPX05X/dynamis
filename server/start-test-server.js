// Set default environment variables for testing if not already set
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.PORT = process.env.PORT || '3000';
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dynamis_messaging_test';
process.env.RATE_LIMIT_WINDOW_MS = '900000';
process.env.RATE_LIMIT_MAX_REQUESTS = '1000';

// Disable Telegram notifications for testing
process.env.TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'test-token';
process.env.TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || 'test-chat-id';

// Import the main server file
require('./server');

console.log(`Test server running in ${process.env.NODE_ENV} mode on port ${process.env.PORT}`);

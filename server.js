import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';

dotenv.config();

const app = express();
const path = require('path');
const fs = require('fs');
const PORT = process.env.PORT || 3001;

// Environment variables
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Security middleware
app.use(helmet());

// CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  'https://dynamis-ib7ekj5cu-jpxxxs-projects.vercel.app',
  'https://dynamis.vercel.app'
];

app.use(cors({
  origin: function(origin, callback) {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
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
app.use(express.static(__dirname, {
  extensions: ['html', 'htm'],
  index: 'home.html' // Serve home.html as the default file
}));

// Handle root and other static file routes
// Handle root and other static file routes
app.get(['/', '/:page'], (req, res, next) => {
  const page = req.params.page || 'home';
  const filePath = path.join(__dirname, `${page}.html`);
  
  // If there's a matching HTML file, serve it
  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }
  
  // If no matching file, serve the home page
  if (page === 'home') {
    return res.sendFile(path.join(__dirname, 'home.html'));
  }
  
  // Otherwise, continue to next middleware
  next();
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

    // Send to Telegram
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
    
    res.status(200).json({ 
      success: true, 
      message: 'Message sent successfully' 
    });

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
    success: false, 
    message: 'Internal server error' 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Form submission endpoint: http://localhost:${PORT}/api/messages`);
  console.log('Press Ctrl+C to stop the server');
});

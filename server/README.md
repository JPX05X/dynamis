# Dynamis Messaging Service

A robust and scalable backend service for handling messages with Telegram integration, built with Node.js, Express, and MongoDB.

## Features

- RESTful API for message management
- Real-time notifications via Telegram
- Input validation and sanitization
- Rate limiting and security best practices
- Comprehensive logging and error handling
- Database seeding for development and testing
- API testing utilities

## Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or cloud instance)
- Telegram Bot Token (for notifications)

## Installation

1. Clone the repository
   ```bash
   git clone https://github.com/your-username/dynamis.git
   cd dynamis/server
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Create a `.env` file in the server directory and configure the environment variables:
   ```env
   # Server Configuration
   PORT=3000
   NODE_ENV=development
   
   # MongoDB Configuration
   MONGODB_URI=mongodb://localhost:27017/dynamis_messaging
   
   # Telegram Bot Configuration
   TELEGRAM_BOT_TOKEN=your_telegram_bot_token
   TELEGRAM_CHAT_ID=your_telegram_chat_id
   
   # Rate Limiting
   RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
   RATE_LIMIT_MAX_REQUESTS=100
   ```

## Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

## Seeding the Database

To populate the database with sample data:

```bash
npm run seed
```

## Testing

### Run Unit Tests
```bash
npm test
```

### Run API Tests
```bash
npm run test:api
```

## API Endpoints

### Messages

- `POST /api/messages` - Create a new message
- `GET /api/messages` - Get all messages (with pagination)
- `GET /api/messages/:id` - Get a specific message
- `PATCH /api/messages/:id/status` - Update message status
- `POST /api/messages/:id/response` - Add a response to a message
- `DELETE /api/messages/:id` - Delete a message

### Health Check
- `GET /api/health` - Check API status

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 3000 |
| NODE_ENV | Environment (development/production) | development |
| MONGODB_URI | MongoDB connection string | mongodb://localhost:27017/dynamis_messaging |
| TELEGRAM_BOT_TOKEN | Telegram bot token | - |
| TELEGRAM_CHAT_ID | Telegram chat ID for notifications | - |
| RATE_LIMIT_WINDOW_MS | Rate limit window in milliseconds | 900000 (15 minutes) |
| RATE_LIMIT_MAX_REQUESTS | Max requests per window | 100 |

## Project Structure

```
server/
├── config/             # Configuration files
├── logs/               # Log files (created at runtime)
├── scripts/            # Utility scripts
├── src/
│   ├── controllers/    # Route controllers
│   ├── middleware/     # Express middleware
│   ├── models/         # MongoDB models
│   ├── routes/         # API routes
│   ├── services/       # Business logic
│   ├── utils/          # Utility functions
│   └── app.js          # Express application
├── tests/              # Test files
├── .env.example        # Example environment variables
├── package.json        # Project dependencies
└── server.js           # Application entry point
```

## Deployment

### Prerequisites
- Node.js and npm installed
- MongoDB instance (local or cloud)
- PM2 or similar process manager (recommended for production)

### Steps
1. Set up environment variables in production
2. Install dependencies: `npm install --production`
3. Start the server: `npm start`

For production, it's recommended to use a process manager like PM2:

```bash
# Install PM2 globally
npm install -g pm2

# Start the application
pm2 start server.js --name "dynamis-messaging"

# Save the process list for automatic startup
pm2 save
pm2 startup
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

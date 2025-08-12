const TelegramBot = require('node-telegram-bot-api');
const config = require('../../config/config');
const logger = require('../utils/logger');

class TelegramService {
  constructor() {
    this.bot = null;
    this.chatId = config.telegram.chatId;
    this.initialize();
  }

  initialize() {
    try {
      if (!config.telegram.botToken) {
        logger.warn('Telegram bot token not configured. Telegram notifications will be disabled.');
        return;
      }

      this.bot = new TelegramBot(config.telegram.botToken, { polling: false });
      logger.info('Telegram bot initialized successfully');
    } catch (error) {
      logger.error(`Failed to initialize Telegram bot: ${error.message}`);
      this.bot = null;
    }
  }

  /**
   * Send a message to the configured Telegram chat
   * @param {string} message - The message to send
   * @param {Object} [options] - Additional options for the message
   * @returns {Promise<Object>} - The result of the sendMessage operation
   */
  async sendMessage(message, options = {}) {
    if (!this.bot || !this.chatId) {
      logger.warn('Telegram bot is not configured. Message not sent.');
      return { success: false, error: 'Telegram bot is not configured' };
    }

    try {
      const defaultOptions = {
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        ...options,
      };

      const result = await this.bot.sendMessage(this.chatId, message, defaultOptions);
      logger.debug('Telegram message sent successfully');
      return { success: true, data: result };
    } catch (error) {
      logger.error(`Failed to send Telegram message: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Format a new message notification for Telegram
   * @param {Object} message - The message object
   * @returns {string} - Formatted message string
   */
  formatNewMessageNotification(message) {
    const { sender, email, phone, subject, content, _id } = message;
    
    return `
📨 <b>New Message Received</b>

👤 <b>From:</b> ${sender}
📧 <b>Email:</b> ${email}
${phone ? `📱 <b>Phone:</b> ${phone}\n` : ''}
📌 <b>Subject:</b> ${subject}

📝 <b>Message:</b>
${content}

🆔 <b>Message ID:</b> <code>${_id}</code>

<a href="${process.env.APP_URL || 'http://your-app-url'}/admin/messages/${_id}">View in Dashboard</a>
    `.trim();
  }

  /**
   * Send a new message notification to Telegram
   * @param {Object} message - The message object
   * @returns {Promise<Object>} - The result of the send operation
   */
  async sendNewMessageNotification(message) {
    const formattedMessage = this.formatNewMessageNotification(message);
    return this.sendMessage(formattedMessage, {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: 'Mark as In Progress',
              callback_data: `status:in_progress:${message._id}`,
            },
            {
              text: 'Mark as Spam',
              callback_data: `status:spam:${message._id}`,
            },
          ],
        ],
      },
    });
  }
}

// Export a singleton instance
module.exports = new TelegramService();

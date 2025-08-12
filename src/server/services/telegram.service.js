import axios from 'axios';
import config from '../config.js';
import logger from '../utils/logger.js';

class TelegramService {
  constructor() {
    this.baseUrl = `https://api.telegram.org/bot${config.TELEGRAM_BOT_TOKEN}`;
  }

  async sendMessage(formData) {
    try {
      const message = this.formatMessage(formData);
      const response = await axios.post(`${this.baseUrl}/sendMessage`, {
        chat_id: config.TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'HTML'
      });

      logger.info('Message sent to Telegram', {
        messageId: response.data.result.message_id,
        chatId: response.data.result.chat.id
      });

      return {
        success: true,
        message: 'Message sent successfully'
      };
    } catch (error) {
      logger.error('Error sending message to Telegram', {
        error: error.message,
        stack: error.stack,
        response: error.response?.data
      });

      return {
        success: false,
        message: 'Failed to send message',
        error: error.message
      };
    }
  }

  formatMessage(formData) {
    const { firstName, lastName, email, phone, subject, message } = formData;
    const name = [firstName, lastName].filter(Boolean).join(' ');
    
    return `
<b>New Contact Form Submission</b>

` +
      `<b>Name:</b> ${name || 'Not provided'}\n` +
      `<b>Email:</b> ${email || 'Not provided'}\n` +
      (phone ? `<b>Phone:</b> ${phone}\n` : '') +
      (subject ? `<b>Subject:</b> ${subject}\n` : '') +
      `<b>Message:</b>\n${message || 'No message provided'}`;
  }
}

export default new TelegramService();

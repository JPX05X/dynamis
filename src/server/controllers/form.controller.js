import telegramService from '../services/telegram.service.js';
import logger from '../utils/logger.js';

class FormController {
  async submitForm(req, res) {
    // Log the incoming request
    logger.info('Form submission received', {
      body: req.body,
      headers: req.headers,
      ip: req.ip
    });

    // Honeypot check
    if (req.body.website) {
      logger.info('Bot detected by honeypot');
      return res.status(200).json({ success: true });
    }

    // Validate required fields
    const requiredFields = ['firstName', 'email', 'message'];
    const missingFields = requiredFields.filter(field => !req.body[field]?.trim());
    
    if (missingFields.length > 0) {
      logger.warn('Missing required fields', { missingFields });
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    try {
      // Send to Telegram
      const result = await telegramService.sendMessage(req.body);
      
      if (!result.success) {
        throw new Error(result.message);
      }

      logger.info('Form submission processed successfully', {
        email: req.body.email,
        name: `${req.body.firstName} ${req.body.lastName || ''}`.trim()
      });

      return res.status(200).json({
        success: true,
        message: 'Message sent successfully!'
      });
    } catch (error) {
      logger.error('Error processing form submission', {
        error: error.message,
        stack: error.stack,
        body: req.body
      });

      return res.status(500).json({
        success: false,
        message: 'An error occurred while processing your request.'
      });
    }
  }
}

export default new FormController();

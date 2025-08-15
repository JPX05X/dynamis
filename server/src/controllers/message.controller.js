const messageService = require('../services/message.service');
const logger = require('../utils/logger');

class MessageController {
  /**
   * Create a new message
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  async createMessage(req, res, next) {
    try {
      // Extract IP and user agent from request
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('user-agent') || '';
      const referrer = req.get('referer') || '';

      // Flexible input mapping
      const {
        name,
        firstName: rawFirstName,
        lastName: rawLastName,
        email,
        subject: rawSubject,
        message,
        content,
        phone,
      } = req.body || {};

      // Split `name` into first/last if provided; otherwise use provided parts
      let firstName = rawFirstName;
      let lastName = rawLastName;
      if (name && (!firstName || !lastName)) {
        const parts = String(name).trim().split(/\s+/);
        firstName = firstName || parts.shift() || '';
        lastName = lastName || parts.join(' ') || '';
      }

      // Prefer explicit `content`, else fallback to `message`
      const normalizedContent = (typeof content === 'string' && content.trim().length)
        ? content
        : (typeof message === 'string' ? message : '');

      // Default subject if not provided
      const subject = (rawSubject && String(rawSubject).trim().length) ? rawSubject : 'New Message';

      // Guard: ensure content is present
      if (!normalizedContent || normalizedContent.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Message content is required',
        });
      }

      const messageData = {
        firstName,
        lastName,
        email,
        phone,
        subject,
        content: normalizedContent,
        ipAddress,
        userAgent,
        referrer,
      };

      const result = await messageService.createMessage(messageData);
      
      res.status(201).json({
        success: true,
        message: 'Message sent successfully',
        data: result.data,
      });
    } catch (error) {
      logger.error(`Error in createMessage: ${error.message}`);
      next(error);
    }
  }

  /**
   * Get all messages with pagination
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  async getMessages(req, res, next) {
    try {
      const { page = 1, limit = 10, status } = req.query;
      
      const query = {};
      if (status) {
        query.status = status;
      }

      const result = await messageService.getMessages({
        page: parseInt(page, 10),
        limit: Math.min(parseInt(limit, 10), 100),
        query,
      });

      res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      logger.error(`Error in getMessages: ${error.message}`);
      next(error);
    }
  }

  /**
   * Get a single message by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  async getMessage(req, res, next) {
    try {
      const { id } = req.params;
      const result = await messageService.getMessageById(id);
      
      res.status(200).json({
        success: true,
        data: result.data,
      });
    } catch (error) {
      logger.error(`Error in getMessage: ${error.message}`);
      next(error);
    }
  }

  /**
   * Update a message status
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  async updateMessageStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const user = req.user; // Assuming user is attached by auth middleware

      const result = await messageService.updateMessageStatus(id, status, user);
      
      res.status(200).json({
        success: true,
        message: 'Message status updated successfully',
        data: result.data,
      });
    } catch (error) {
      logger.error(`Error in updateMessageStatus: ${error.message}`);
      next(error);
    }
  }

  /**
   * Add a response to a message
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  async addResponse(req, res, next) {
    try {
      const { id } = req.params;
      const { response } = req.body;
      const user = req.user; // Assuming user is attached by auth middleware

      if (!response) {
        return res.status(400).json({
          success: false,
          message: 'Response content is required',
        });
      }

      const result = await messageService.addResponse(id, response, user);
      
      res.status(200).json({
        success: true,
        message: 'Response added successfully',
        data: result.data,
      });
    } catch (error) {
      logger.error(`Error in addResponse: ${error.message}`);
      next(error);
    }
  }

  /**
   * Delete a message
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  async deleteMessage(req, res, next) {
    try {
      const { id } = req.params;
      await messageService.deleteMessage(id);
      
      res.status(200).json({
        success: true,
        message: 'Message deleted successfully',
      });
    } catch (error) {
      logger.error(`Error in deleteMessage: ${error.message}`);
      next(error);
    }
  }
}

module.exports = new MessageController();

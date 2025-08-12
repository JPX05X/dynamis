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

      const { firstName, lastName, email, subject, message } = req.body;
      const messageData = {
        firstName,
        lastName,
        email,
        subject,
        message,
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

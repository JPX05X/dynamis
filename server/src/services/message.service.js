const mongoose = require('mongoose');
const Message = require('../models/message.model');
const telegramService = require('./telegram.service');
const logger = require('../utils/logger');

// Create a default system ObjectId
const DEFAULT_SYSTEM_ID = new mongoose.Types.ObjectId('000000000000000000000001');

class MessageService {
  /**
   * Create a new message
   * @param {Object} messageData - The message data
   * @returns {Promise<Object>} - The created message
   */
  async createMessage(messageData) {
    try {
      // Ensure required fields are present
      if (!messageData.firstName || !messageData.lastName || !messageData.email || !messageData.content) {
        throw new Error('Missing required fields');
      }

      const message = new Message({
        firstName: messageData.firstName.trim(),
        lastName: messageData.lastName.trim(),
        email: messageData.email.trim().toLowerCase(),
        phone: messageData.phone ? messageData.phone.trim() : '',
        subject: messageData.subject ? messageData.subject.trim() : 'New Message',
        content: messageData.content.trim(),
        status: 'new',
        metadata: {
          ipAddress: messageData.ipAddress || 'unknown',
          userAgent: messageData.userAgent || 'unknown',
          referrer: messageData.referrer || 'unknown',
          formData: messageData
        },
      });

      const savedMessage = await message.save();
      
      // Send Telegram notification (non-blocking)
      this._sendNotification(savedMessage).catch(error => {
        logger.error(`Failed to send Telegram notification: ${error.message}`);
      });

      return {
        success: true,
        data: savedMessage,
      };
    } catch (error) {
      logger.error(`Error creating message: ${error.message}`);
      throw new Error('Failed to create message');
    }
  }

  /**
   * Get all messages with pagination
   * @param {Object} options - Query options
   * @param {number} options.page - Page number
   * @param {number} options.limit - Number of items per page
   * @param {Object} options.query - Additional query filters
   * @returns {Promise<Object>} - Paginated messages
   */
  async getMessages({ page = 1, limit = 10, query = {} } = {}) {
    try {
      const result = await Message.findWithPagination(query, { page, limit });
      return {
        success: true,
        data: result.data,
        pagination: result.pagination,
      };
    } catch (error) {
      logger.error(`Error getting messages: ${error.message}`);
      throw new Error('Failed to get messages');
    }
  }

  /**
   * Get a message by ID
   * @param {string} id - The message ID
   * @returns {Promise<Object>} - The message
   */
  async getMessageById(id) {
    try {
      const message = await Message.findById(id);
      if (!message) {
        throw new Error('Message not found');
      }
      return {
        success: true,
        data: message,
      };
    } catch (error) {
      logger.error(`Error getting message ${id}: ${error.message}`);
      throw new Error('Failed to get message');
    }
  }

  /**
   * Update a message status
   * @param {string} id - The message ID
   * @param {string} status - The new status
   * @param {Object} user - The user making the update
   * @returns {Promise<Object>} - The updated message
   */
  async updateMessageStatus(id, status, user) {
    try {
      const allowedStatuses = ['new', 'in_progress', 'resolved', 'spam'];
      if (!allowedStatuses.includes(status)) {
        throw new Error('Invalid status');
      }

      const update = { status };
      
      // If status is being resolved, add response info
      if (status === 'resolved' && user) {
        update.response = {
          content: 'Marked as resolved',
          respondedAt: new Date(),
          respondedBy: user._id,
        };
      }

      const message = await Message.findByIdAndUpdate(
        id,
        { $set: update },
        { new: true, runValidators: true }
      );

      if (!message) {
        throw new Error('Message not found');
      }

      return {
        success: true,
        data: message,
      };
    } catch (error) {
      logger.error(`Error updating message status: ${error.message}`);
      throw new Error('Failed to update message status');
    }
  }

  /**
   * Add a response to a message
   * @param {string} id - The message ID
   * @param {string} content - The response content
   * @param {Object} user - The user adding the response
   * @returns {Promise<Object>} - The updated message
   */
  async addResponse(id, content, user) {
    try {
      if (!content) {
        throw new Error('Response content is required');
      }

      const response = {
        content,
        respondedAt: new Date(),
        // If user is not provided, use the default system ObjectId
        respondedBy: user?._id || DEFAULT_SYSTEM_ID,
      };

      const message = await Message.findByIdAndUpdate(
        id,
        { 
          $set: { 
            'response': response,
            'status': 'resolved',
          },
        },
        { new: true, runValidators: true }
      );

      if (!message) {
        throw new Error('Message not found');
      }

      return {
        success: true,
        data: message,
      };
    } catch (error) {
      logger.error(`Error adding response to message: ${error.message}`);
      throw new Error('Failed to add response');
    }
  }

  /**
   * Delete a message
   * @param {string} id - The message ID
   * @returns {Promise<Object>} - The result of the operation
   */
  async deleteMessage(id) {
    try {
      const result = await Message.findByIdAndDelete(id);
      if (!result) {
        throw new Error('Message not found');
      }
      return {
        success: true,
        message: 'Message deleted successfully',
      };
    } catch (error) {
      logger.error(`Error deleting message: ${error.message}`);
      throw new Error('Failed to delete message');
    }
  }

  /**
   * Send notification about a new message
   * @private
   * @param {Object} message - The message to notify about
   * @returns {Promise<void>}
   */
  async _sendNotification(message) {
    try {
      await telegramService.sendNewMessageNotification(message);
      logger.info(`Notification sent for message ${message._id}`);
    } catch (error) {
      logger.error(`Failed to send notification: ${error.message}`);
      // Don't throw the error, as we don't want to fail the message creation
    }
  }
}

// Export a singleton instance
module.exports = new MessageService();

import { v4 as uuidv4 } from 'uuid';
import sanitizeHtml from 'sanitize-html';
import logger from '../utils/logger.js';
import Message from '../models/message.model.js';
import { validationResult } from 'express-validator';
import { validateContactForm } from '../validators/contact.validator.js';

class MessageController {
  /**
   * Normalize and sanitize message data
   * @param {Object} data - Raw message data
   * @returns {Object} Normalized message data
   */
  static #normalizeMessageData(data) {
    const {
      name,
      firstName: rawFirstName,
      lastName: rawLastName,
      email,
      subject: rawSubject,
      message,
      content,
      phone,
      website,
      privacyPolicyAccepted: rawPrivacy,
      marketingConsent: rawMarketing,
      _csrf,
      ...restData
    } = data;

    // Handle first name and last name from name field if separate fields not provided
    let firstName = rawFirstName || '';
    let lastName = rawLastName || '';
    
    if (name && !firstName && !lastName) {
      const nameParts = name.trim().split(/\s+/);
      firstName = nameParts[0] || '';
      lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
    }

    // Sanitize and trim all string fields
    const sanitizeOptions = {
      allowedTags: [],
      allowedAttributes: {},
    };

    // Coerce boolean-like values often sent by browsers (e.g., 'on', 'true', '1')
    const toBool = (v) => {
      if (typeof v === 'boolean') return v;
      if (typeof v === 'number') return v === 1;
      if (typeof v === 'string') {
        const s = v.trim().toLowerCase();
        return s === 'on' || s === 'true' || s === '1' || s === 'yes';
      }
      return false;
    };

    const sanitizedData = {
      firstName: sanitizeHtml(firstName.trim(), sanitizeOptions),
      lastName: sanitizeHtml(lastName.trim(), sanitizeOptions),
      email: sanitizeHtml((email || '').toLowerCase().trim(), sanitizeOptions),
      subject: sanitizeHtml((rawSubject || '').trim(), sanitizeOptions),
      message: sanitizeHtml((message || content || '').trim(), sanitizeOptions),
      phone: phone ? sanitizeHtml(phone.trim(), sanitizeOptions) : '',
      privacyPolicyAccepted: toBool(rawPrivacy),
      marketingConsent: toBool(rawMarketing),
      ...restData,
    };

    return sanitizedData;
  }

  /**
   * Create a new message
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async createMessage(req, res) {
    const requestId = uuidv4();
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent') || '';
    
    try {
      // Honeypot check (silent success for bots)
      if (req.body.website) {
        logger.info('Bot detected by honeypot', {
          requestId,
          ip: ipAddress,
          userAgent,
          timestamp: new Date().toISOString()
        });
        return res.status(200).json({
          success: true,
          message: 'Message received',
          requestId
        });
      }

      // Normalize and validate the message data
      const messageData = MessageController.#normalizeMessageData(req.body);
      
      // Validate using Joi schema
      const { error } = validateContactForm(messageData);
      
      if (error) {
        const validationErrors = error.details.map(detail => ({
          field: detail.context.key,
          message: detail.message,
          type: detail.type
        }));
        
        logger.warn('Validation failed', {
          requestId,
          errors: validationErrors,
          ip: ipAddress,
          userAgent
        });
        
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validationErrors,
          requestId
        });
      }
      
      // Create the message in the database
      const newMessage = new Message({
        ...messageData,
        metadata: {
          ipAddress,
          userAgent,
          referrer: req.get('referer') || 'direct',
          requestId
        }
      });
      
      await newMessage.save();
      
      // Log successful message creation
      logger.info('Message created successfully', {
        messageId: newMessage._id,
        requestId,
        ip: ipAddress
      });
      
      // Return success response
      return res.status(201).json({
        success: true,
        message: 'Message received successfully',
        requestId,
        messageId: newMessage._id
      });
      
    } catch (error) {
      logger.error('Error creating message', {
        error: error.message,
        stack: error.stack,
        requestId,
        ip: ipAddress,
        userAgent
      });
      
      return res.status(500).json({
        success: false,
        message: 'An error occurred while processing your message',
        requestId
      });
    }
  }
  
  /**
   * Get all messages with pagination
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getMessages(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;
      
      const query = {};
      
      // Add search filter if provided
      if (req.query.search) {
        query.$or = [
          { firstName: { $regex: req.query.search, $options: 'i' } },
          { lastName: { $regex: req.query.search, $options: 'i' } },
          { email: { $regex: req.query.search, $options: 'i' } },
          { subject: { $regex: req.query.search, $options: 'i' } },
          { message: { $regex: req.query.search, $options: 'i' } }
        ];
      }
      
      // Add status filter if provided
      if (req.query.status) {
        query.status = req.query.status;
      }
      
      const [messages, total] = await Promise.all([
        Message.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Message.countDocuments(query)
      ]);
      
      return res.json({
        success: true,
        data: messages,
        pagination: {
          total,
          page,
          pages: Math.ceil(total / limit),
          limit
        }
      });
      
    } catch (error) {
      logger.error('Error fetching messages', {
        error: error.message,
        stack: error.stack
      });
      
      return res.status(500).json({
        success: false,
        message: 'An error occurred while fetching messages'
      });
    }
  }
  
  /**
   * Get a single message by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getMessage(req, res) {
    try {
      const message = await Message.findById(req.params.id).lean();
      
      if (!message) {
        return res.status(404).json({
          success: false,
          message: 'Message not found'
        });
      }
      
      return res.json({
        success: true,
        data: message
      });
      
    } catch (error) {
      logger.error('Error fetching message', {
        error: error.message,
        stack: error.stack,
        messageId: req.params.id
      });
      
      return res.status(500).json({
        success: false,
        message: 'An error occurred while fetching the message'
      });
    }
  }
  
  /**
   * Update message status
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateMessageStatus(req, res) {
    try {
      const { status, statusReason } = req.body;
      
      const message = await Message.findByIdAndUpdate(
        req.params.id,
        { 
          status,
          ...(statusReason && { statusReason }),
          updatedAt: new Date()
        },
        { new: true, runValidators: true }
      );
      
      if (!message) {
        return res.status(404).json({
          success: false,
          message: 'Message not found'
        });
      }
      
      return res.json({
        success: true,
        data: message
      });
      
    } catch (error) {
      logger.error('Error updating message status', {
        error: error.message,
        stack: error.stack,
        messageId: req.params.id
      });
      
      return res.status(500).json({
        success: false,
        message: 'An error occurred while updating the message status'
      });
    }
  }
  
  /**
   * Delete a message (soft delete)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async deleteMessage(req, res) {
    try {
      const message = await Message.findByIdAndUpdate(
        req.params.id,
        { 
          deleted: true,
          deletedAt: new Date(),
          deletedBy: req.user?.id || 'system'
        },
        { new: true }
      );
      
      if (!message) {
        return res.status(404).json({
          success: false,
          message: 'Message not found'
        });
      }
      
      return res.json({
        success: true,
        message: 'Message deleted successfully'
      });
      
    } catch (error) {
      logger.error('Error deleting message', {
        error: error.message,
        stack: error.stack,
        messageId: req.params.id
      });
      
      return res.status(500).json({
        success: false,
        message: 'An error occurred while deleting the message'
      });
    }
  }

  /**
   * Add a response to a message
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async addResponse(req, res, next) {
    try {
      const { id } = req.params;
      const { content, isInternalNote = false } = req.body;
      const userId = req.user?._id; // Assuming user is attached to request by auth middleware

      // Find the message
      const message = await Message.findById(id);
      if (!message) {
        return res.status(404).json({ success: false, message: 'Message not found' });
      }

      // Add the response
      message.responses.push({
        content: sanitizeHtml(content),
        isInternalNote,
        createdBy: userId
      });

      // If it's not an internal note, update the status to indicate there's a response
      if (!isInternalNote) {
        message.status = 'in_progress';
      }

      await message.save();

      // TODO: Send email notification to the message sender if it's not an internal note
      
      res.status(201).json({
        success: true,
        data: message.responses[message.responses.length - 1]
      });
    } catch (error) {
      logger.error('Error adding response to message', { 
        error: error.message, 
        messageId: req.params.id,
        userId: req.user?._id 
      });
      next(error);
    }
  }
}

// Create a singleton instance
export const messageController = new MessageController();

// Export the class for testing and the instance for normal use
export { MessageController };

export default messageController;

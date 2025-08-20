import mongoose from 'mongoose';
const { Schema } = mongoose;

// Define the message schema
const messageSchema = new Schema(
  {
    // Sender information
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    
    // Sender's email
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    
    // Sender's phone number (optional)
    phone: {
      type: String,
      trim: true,
    },
    
    // Message subject
    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    
    // Message content
    message: {
      type: String,
      required: true,
      trim: true,
    },
    
    // Message status
    status: {
      type: String,
      enum: ['new', 'in_progress', 'resolved', 'spam'],
      default: 'new',
    },
    
    // Priority level
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    
    // Assigned to (user ID)
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    
    // Tags for categorization
    tags: [{
      type: String,
      trim: true,
    }],
    
    // Responses to the message
    responses: [{
      content: {
        type: String,
        required: true,
        trim: true,
      },
      isInternalNote: {
        type: Boolean,
        default: false,
      },
      createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    }],
    
    // Metadata
    metadata: {
      ipAddress: String,
      userAgent: String,
      referrer: String,
      requestId: String,
    },
    
    // Soft delete flag
    deleted: {
      type: Boolean,
      default: false,
    },
    
    // Tracking who deleted the message
    deletedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    
    // When the message was deleted
    deletedAt: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Add indexes for better query performance
messageSchema.index({ email: 1, createdAt: -1 });
messageSchema.index({ status: 1, createdAt: -1 });
messageSchema.index({ priority: 1, createdAt: -1 });
messageSchema.index({ assignedTo: 1, status: 1 });
messageSchema.index({ 'metadata.ipAddress': 1 }, { sparse: true });

/**
 * Static method to get all messages with pagination
 * @param {Object} query - Query conditions
 * @param {Object} options - Options for pagination and sorting
 * @returns {Promise<Object>} Paginated messages
 */
messageSchema.statics.findWithPagination = async function(query = {}, options = {}) {
  const {
    page = 1,
    limit = 10,
    sort = '-createdAt',
    search = '',
    ...filters
  } = options;
  
  // Add search criteria if provided
  if (search) {
    query.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { subject: { $regex: search, $options: 'i' } },
      { message: { $regex: search, $options: 'i' } },
    ];
  }
  
  // Add other filters
  Object.keys(filters).forEach(key => {
    if (filters[key] !== undefined && filters[key] !== '') {
      query[key] = filters[key];
    }
  });
  
  // Only show non-deleted messages by default
  if (query.deleted === undefined) {
    query.deleted = { $ne: true };
  }
  
  const skip = (page - 1) * limit;
  
  const [messages, total] = await Promise.all([
    this.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('assignedTo', 'firstName lastName email')
      .populate('responses.createdBy', 'firstName lastName email')
      .lean(),
    this.countDocuments(query),
  ]);
  
  return {
    data: messages,
    pagination: {
      total,
      page,
      pages: Math.ceil(total / limit),
      limit,
    },
  };
};

// Export the model
const Message = mongoose.model('Message', messageSchema);

export { Message };
export default Message;

const mongoose = require('mongoose');
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
    
    // Sender's phone (optional)
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
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },
    
    // Message status
    status: {
      type: String,
      enum: ['new', 'in_progress', 'resolved', 'spam'],
      default: 'new',
    },
    
    // Admin response (if any)
    response: {
      content: String,
      respondedAt: Date,
      respondedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User', // If you have user authentication
      },
    },
    
    // Additional metadata
    metadata: {
      ipAddress: String,
      userAgent: String,
      referrer: String,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better query performance
messageSchema.index({ status: 1, createdAt: -1 }); // For filtering by status with latest first
messageSchema.index({ email: 1, createdAt: -1 });  // For finding messages by email
messageSchema.index({ createdAt: -1 });            // For general sorting by creation date
messageSchema.index({
  'metadata.ipAddress': 1,
  createdAt: -1
}, { 
  name: 'ipAddress_createdAt_idx',
  partialFilterExpression: { 'metadata.ipAddress': { $exists: true, $type: 'string' } }
}); // For rate limiting and spam detection

// Text index for search functionality
messageSchema.index(
  { 
    subject: 'text',
    content: 'text',
    firstName: 'text',
    lastName: 'text',
    email: 'text'
  },
  {
    name: 'message_text_search_idx',
    weights: {
      subject: 10,
      content: 5,
      email: 3,
      firstName: 2,
      lastName: 2
    },
    default_language: 'english',
    language_override: 'search_lang'
  }
);

// Virtual for message URL (if needed)
messageSchema.virtual('url').get(function () {
  return `/api/messages/${this._id}`;
});

// Pre-save hook to handle any pre-processing
messageSchema.pre('save', function (next) {
  // Any pre-processing before saving can be done here
  next();
});

// Static method to get all messages with pagination
messageSchema.statics.findWithPagination = async function (query = {}, options = {}) {
  const { page = 1, limit = 10, sort = { createdAt: -1 } } = options;
  
  const skip = (page - 1) * limit;
  
  const [messages, total] = await Promise.all([
    this.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    this.countDocuments(query),
  ]);
  
  const totalPages = Math.ceil(total / limit);
  
  return {
    data: messages,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
};

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;

/**
 * Migration: Add initial indexes for Message model
 * 
 * This migration creates the necessary indexes for the Message model
 * to optimize query performance and enable text search functionality.
 */

module.exports = {
  description: 'Add initial indexes for Message model',
  
  async up(db) {
    const collection = db.collection('messages');
    
    // Create single field indexes
    await collection.createIndex({ status: 1, createdAt: -1 });
    await collection.createIndex({ email: 1, createdAt: -1 });
    await collection.createIndex({ createdAt: -1 });
    
    // Create compound index for IP-based rate limiting
    await collection.createIndex(
      { 'metadata.ipAddress': 1, createdAt: -1 },
      { 
        name: 'ipAddress_createdAt_idx',
        partialFilterExpression: { 'metadata.ipAddress': { $exists: true, $type: 'string' } }
      }
    );
    
    // Create text index for search functionality
    await collection.createIndex(
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
    
    console.log('Created indexes for messages collection');
  },
  
  async down(db) {
    const collection = db.collection('messages');
    
    // Drop all indexes except the default _id_ index
    const indexes = await collection.listIndexes().toArray();
    for (const index of indexes) {
      if (index.name !== '_id_') {
        await collection.dropIndex(index.name);
        console.log(`Dropped index: ${index.name}`);
      }
    }
    
    console.log('Dropped all indexes from messages collection');
  }
};

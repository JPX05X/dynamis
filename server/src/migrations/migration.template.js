/**
 * Migration: [Brief description of what this migration does]
 * 
 * This migration [detailed description of changes]
 */

module.exports = {
  // A description of what this migration does
  description: 'Brief description of the migration',
  
  // The up function is called when applying the migration
  async up(db) {
    // Write your migration code here
    // Example:
    // await db.collection('users').createIndex({ email: 1 }, { unique: true });
  },
  
  // The down function is called when rolling back the migration
  async down(db) {
    // Write code to undo the migration
    // Example:
    // await db.collection('users').dropIndex('email_1');
  }
};

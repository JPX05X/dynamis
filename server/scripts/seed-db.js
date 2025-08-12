#!/usr/bin/env node

/**
 * Database Seeding Script
 * 
 * This script populates the database with sample data for testing and development.
 * It can be run with: npm run seed
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { faker } = require('@faker-js/faker');
const config = require('../config/config');
const Message = require('../src/models/message.model');
const logger = require('../src/utils/logger');

// Number of sample messages to generate
const SAMPLE_MESSAGES_COUNT = 20;

// Sample data generators
const generateSampleMessage = (index) => {
  const statuses = ['new', 'in_progress', 'resolved', 'spam'];
  const status = statuses[Math.floor(Math.random() * statuses.length)];
  
  const message = {
    sender: faker.person.fullName(),
    email: faker.internet.email().toLowerCase(),
    phone: faker.phone.number(),
    subject: `Test Message ${index + 1}: ${faker.lorem.words(3)}`,
    content: faker.lorem.paragraphs(2, '\n\n'),
    status,
    metadata: {
      ipAddress: faker.internet.ip(),
      userAgent: faker.internet.userAgent(),
      referrer: faker.internet.url(),
    },
  };

  // Add response for some messages
  if (status === 'resolved') {
    message.response = {
      content: faker.lorem.paragraph(),
      respondedAt: faker.date.recent({ days: 7 }),
      respondedBy: new mongoose.Types.ObjectId(),
    };
  }

  return message;
};

/**
 * Connect to the database
 */
const connectDB = async () => {
  try {
    await mongoose.connect(config.database.uri, config.database.options);
    logger.info('Connected to MongoDB');
  } catch (error) {
    logger.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

/**
 * Clear existing data from the database
 */
const clearDatabase = async () => {
  try {
    await Message.deleteMany({});
    logger.info('Cleared existing messages');
  } catch (error) {
    logger.error(`Error clearing database: ${error.message}`);
    throw error;
  }
};

/**
 * Seed the database with sample data
 */
const seedDatabase = async () => {
  try {
    const messages = [];
    
    // Generate sample messages
    for (let i = 0; i < SAMPLE_MESSAGES_COUNT; i++) {
      messages.push(generateSampleMessage(i));
    }
    
    // Insert messages into the database
    await Message.insertMany(messages);
    logger.info(`Inserted ${messages.length} sample messages`);
    
    return messages.length;
  } catch (error) {
    logger.error(`Error seeding database: ${error.message}`);
    throw error;
  }
};

/**
 * Main function to run the seeding process
 */
const run = async () => {
  try {
    logger.info('Starting database seeding...');
    
    // Connect to the database
    await connectDB();
    
    // Clear existing data
    await clearDatabase();
    
    // Seed with sample data
    const count = await seedDatabase();
    
    logger.info(`Database seeding completed successfully. Created ${count} messages.`);
    process.exit(0);
  } catch (error) {
    logger.error(`Database seeding failed: ${error.message}`);
    process.exit(1);
  }
};

// Run the script
if (require.main === module) {
  run();
}

module.exports = {
  generateSampleMessage,
  connectDB,
  clearDatabase,
  seedDatabase,
};

#!/usr/bin/env node

/**
 * API Test Script
 * 
 * This script tests the API endpoints to ensure they are working correctly.
 * It can be run with: npm run test:api
 */

require('dotenv').config();
const axios = require('axios');
const { faker } = require('@faker-js/faker');
const logger = require('../src/utils/logger');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';
const TEST_MESSAGE_ID = 'test-message-id';

// Create an axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  validateStatus: () => true, // Don't throw on HTTP error status
});

/**
 * Test helper function to make API requests and log results
 */
async function testEndpoint({
  method = 'get',
  endpoint,
  data = null,
  description,
  expectedStatus = 200,
}) {
  try {
    logger.info(`\n${description}...`);
    const response = await api({
      method,
      url: endpoint,
      data,
    });

    const success = response.status === expectedStatus;
    const statusMsg = `${response.status} ${response.statusText}`;
    
    if (success) {
      logger.success(`✓ ${description} (${statusMsg})`);
    } else {
      logger.error(`✗ ${description} (${statusMsg})`);
      if (response.data) {
        logger.error('Response:', JSON.stringify(response.data, null, 2));
      }
    }

    return { success, response };
  } catch (error) {
    logger.error(`✗ ${description} (Error: ${error.message})`);
    return { success: false, error };
  }
}

/**
 * Run all API tests
 */
async function runTests() {
  logger.info('Starting API Tests...\n');
  
  // 1. Test health check endpoint
  await testEndpoint({
    endpoint: '/health',
    description: 'Health check endpoint should return 200',
  });

  // 2. Test creating a new message
  const testMessage = {
    name: faker.person.fullName(),
    email: faker.internet.email().toLowerCase(),
    phone: faker.phone.number(),
    subject: `Test Message - ${faker.lorem.words(3)}`,
    message: faker.lorem.paragraphs(2, '\n\n'),
  };

  const { response: createResponse } = await testEndpoint({
    method: 'post',
    endpoint: '/messages',
    data: testMessage,
    description: 'Create a new message',
    expectedStatus: 201,
  });

  const messageId = createResponse?.data?.data?._id;
  
  if (messageId) {
    // 3. Test getting the created message
    await testEndpoint({
      endpoint: `/messages/${messageId}`,
      description: 'Get message by ID',
      expectedStatus: 200,
    });

    // 4. Test updating message status
    await testEndpoint({
      method: 'patch',
      endpoint: `/messages/${messageId}/status`,
      data: { status: 'in_progress' },
      description: 'Update message status',
      expectedStatus: 200,
    });

    // 5. Test adding a response
    await testEndpoint({
      method: 'post',
      endpoint: `/messages/${messageId}/response`,
      data: { 
        response: 'Thank you for your message. We are looking into it.' 
      },
      description: 'Add response to message',
      expectedStatus: 200,
    });

    // 6. Test getting all messages
    await testEndpoint({
      endpoint: '/messages?status=in_progress',
      description: 'Get all messages with status filter',
      expectedStatus: 200,
    });

    // 7. Test deleting the message
    await testEndpoint({
      method: 'delete',
      endpoint: `/messages/${messageId}`,
      description: 'Delete message',
      expectedStatus: 200,
    });
  } else {
    logger.warn('Skipping dependent tests because message creation failed');
  }

  // 8. Test validation
  await testEndpoint({
    method: 'post',
    endpoint: '/messages',
    data: { name: 'A' }, // Invalid data
    description: 'Validation should fail with invalid data',
    expectedStatus: 400,
  });

  // 9. Test 404 for non-existent message
  await testEndpoint({
    endpoint: '/messages/non-existent-id',
    description: 'Get non-existent message should return 404',
    expectedStatus: 404,
  });

  logger.info('\nAPI Tests completed!');
}

// Run the tests
runTests().catch((error) => {
  logger.error('Unhandled error in test script:', error);
  process.exit(1);
});

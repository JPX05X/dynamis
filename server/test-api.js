const axios = require('axios');
const { faker } = require('@faker-js/faker');

// Configuration
const API_BASE_URL = 'http://localhost:3000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper function to generate a valid phone number matching our validation regex
const generateValidPhoneNumber = () => {
  // Generate a simple 10-digit number with optional country code
  const countryCode = faker.datatype.boolean() ? '+1 ' : '';
  const areaCode = faker.number.int({ min: 200, max: 999 });
  const firstPart = faker.number.int({ min: 100, max: 999 });
  const secondPart = faker.number.int({ min: 1000, max: 9999 });
  
  // Format as +1 (123) 456-7890 or (123) 456-7890
  return `${countryCode}(${areaCode}) ${firstPart}-${secondPart}`;
};

// Test data
const testMessage = {
  name: faker.person.fullName(),
  email: faker.internet.email().toLowerCase(),
  // Generate a phone number that matches our validation regex: /^[0-9+\-\s()]+$/
  phone: generateValidPhoneNumber(),
  subject: `Test Message - ${faker.lorem.words(3)}`,
  message: faker.lorem.paragraphs(2, '\n\n'),
};

// Test cases
const runTests = async () => {
  console.log('🚀 Starting API Tests...\n');
  
  try {
    // 1. Test health check
    console.log('1. Testing health check...');
    const healthResponse = await api.get('/health');
    console.log(`✅ Health check: ${healthResponse.status} ${healthResponse.statusText}`);
    
    // 2. Create a new message
    console.log('\n2. Creating a new message...');
    const createResponse = await api.post('/messages', testMessage);
    const messageId = createResponse.data.data._id;
    console.log(`✅ Message created with ID: ${messageId}`);
    
    // 3. Get the created message
    console.log('\n3. Retrieving the created message...');
    const getResponse = await api.get(`/messages/${messageId}`);
    console.log(`✅ Message retrieved: ${getResponse.data.data.subject}`);
    
    // 4. Update message status
    console.log('\n4. Updating message status...');
    await api.patch(`/messages/${messageId}/status`, { status: 'in_progress' });
    console.log('✅ Message status updated to in_progress');
    
    // 5. Add a response to the message
    console.log('\n5. Adding a response to the message...');
    await api.post(`/messages/${messageId}/response`, {
      response: 'Thank you for your message. We are looking into it.'
    });
    console.log('✅ Response added to message');
    
    // 6. List all messages
    console.log('\n6. Listing all messages...');
    const listResponse = await api.get('/messages');
    console.log(`✅ Found ${listResponse.data.data.length} messages`);
    
    // 7. Delete the test message
    console.log('\n7. Cleaning up - deleting test message...');
    await api.delete(`/messages/${messageId}`);
    console.log('✅ Test message deleted');
    
    console.log('\n🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:');
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Error:', error.message);
    }
    process.exit(1);
  }
};

// Run the tests
runTests();

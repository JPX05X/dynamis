import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

async function testConnection() {
  const uri = process.env.MONGODB_URI;
  console.log('🔌 Testing connection to:', uri.replace(/:[^:]*@/, ':***@'));
  
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });

  try {
    await client.connect();
    console.log('✅ Successfully connected to MongoDB!');
    
    const db = client.db('dynamis_messaging');
    const collections = await db.listCollections().toArray();
    console.log('📋 Collections:', collections.map(c => c.name));
    
  } catch (error) {
    console.error('❌ Connection error:', error.message);
    console.error('Error details:', JSON.stringify(error, null, 2));
    throw error;
  } finally {
    await client.close();
    console.log('👋 Connection closed');
  }
}

testConnection().catch(console.error);

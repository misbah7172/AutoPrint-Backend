#!/usr/bin/env node

/**
 * MongoDB Connection Test Script
 * Tests the MongoDB connection and basic operations
 */

const { database, User } = require('./src/models/mongodb');

async function testConnection() {
  try {
    console.log('🔍 Testing MongoDB connection...');
    
    // Test connection
    await database.connect();
    console.log('✅ Successfully connected to MongoDB');
    
    // Test database operations
    console.log('🧪 Testing basic database operations...');
    
    // Count documents
    const userCount = await User.countDocuments();
    console.log(`📊 Found ${userCount} users in database`);
    
    // Test query
    if (userCount > 0) {
      const sampleUser = await User.findOne({}, 'email firstName lastName role').lean();
      console.log('👤 Sample user:', sampleUser);
    }
    
    // Test database stats
    const db = database.getConnection().db;
    const collections = await db.listCollections().toArray();
    console.log(`📁 Available collections: ${collections.map(c => c.name).join(', ')}`);
    
    const stats = await db.stats();
    console.log('📈 Database stats:');
    console.log(`   Collections: ${stats.collections}`);
    console.log(`   Documents: ${stats.objects}`);
    console.log(`   Data Size: ${(stats.dataSize / 1024).toFixed(2)} KB`);
    console.log(`   Storage Size: ${(stats.storageSize / 1024).toFixed(2)} KB`);
    
    console.log('🎉 All tests passed! MongoDB is ready to use.');
    
  } catch (error) {
    console.error('❌ Connection test failed:', error);
    
    if (error.name === 'MongoServerError') {
      console.error('💡 This might be a MongoDB server issue. Check your connection string and server status.');
    } else if (error.name === 'MongoNetworkError') {
      console.error('💡 Network connection failed. Check your internet connection and MongoDB URL.');
    } else if (error.code === 'ENOTFOUND') {
      console.error('💡 DNS resolution failed. Check if the MongoDB host is correct.');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('💡 Connection refused. Check if MongoDB is running and accessible.');
    }
    
    process.exit(1);
  } finally {
    await database.disconnect();
    console.log('📡 Database connection closed');
  }
}

// Run the test
testConnection();
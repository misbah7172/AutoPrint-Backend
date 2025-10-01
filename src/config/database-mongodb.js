const mongoose = require('mongoose');

class Database {
  constructor() {
    this.connection = null;
  }

  async connect(mongoUrl = null) {
    try {
      const url = mongoUrl || process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017/autoprint';
      
      console.log('🚀 Connecting to MongoDB...');
      console.log('📍 URL:', url.replace(/\/\/.*@/, '//***:***@')); // Hide credentials in logs
      
      const options = {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 30000, // Increased for cloud connection
        socketTimeoutMS: 45000,
        bufferCommands: false,
        retryWrites: true,
        w: 'majority'
      };

      this.connection = await mongoose.connect(url, options);
      
      console.log('✅ MongoDB connected successfully');
      console.log('🏠 Database:', this.connection.connection.name);
      console.log('📊 Ready state:', this.connection.connection.readyState);
      
      return this.connection;
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error.message);
      throw error;
    }
  }

  async disconnect() {
    if (this.connection) {
      await mongoose.disconnect();
      console.log('📡 MongoDB disconnected');
      this.connection = null;
    }
  }

  isConnected() {
    return mongoose.connection.readyState === 1;
  }

  getConnection() {
    return mongoose.connection;
  }
}

// MongoDB event listeners
mongoose.connection.on('connecting', () => {
  console.log('🔄 Connecting to MongoDB...');
});

mongoose.connection.on('connected', () => {
  console.log('🔗 MongoDB connected');
});

mongoose.connection.on('disconnecting', () => {
  console.log('🔄 Disconnecting from MongoDB...');
});

mongoose.connection.on('disconnected', () => {
  console.log('📡 MongoDB disconnected');
});

mongoose.connection.on('error', (error) => {
  console.error('❌ MongoDB error:', error);
});

module.exports = new Database();
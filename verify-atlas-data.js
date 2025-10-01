const mongoose = require('mongoose');
require('dotenv').config();

async function verifyData() {
  try {
    const mongoUrl = process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017/autoprint';
    await mongoose.connect(mongoUrl);
    console.log('Connected to MongoDB Atlas');
    
    // List all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));
    
    // Check specific collections
    const userCount = await mongoose.connection.db.collection('users').countDocuments();
    const printJobCount = await mongoose.connection.db.collection('printjobs').countDocuments();
    const paymentCount = await mongoose.connection.db.collection('payments').countDocuments();
    
    console.log('Data counts:');
    console.log('- Users:', userCount);
    console.log('- Print Jobs:', printJobCount);
    console.log('- Payments:', paymentCount);
    
    // Sample user document
    const sampleUser = await mongoose.connection.db.collection('users').findOne();
    console.log('Sample user:', JSON.stringify(sampleUser, null, 2));
    
    await mongoose.disconnect();
    console.log('Disconnected');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

verifyData();
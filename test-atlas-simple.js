const mongoose = require('mongoose');
const { User, PrintJob, Payment } = require('./src/models/mongodb');
require('dotenv').config();

async function createSimpleTestData() {
  try {
    const mongoUrl = process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017/autoprint';
    await mongoose.connect(mongoUrl);
    console.log('Connected to MongoDB Atlas');
    
    // Clear existing data
    await User.deleteMany({});
    await PrintJob.deleteMany({});
    await Payment.deleteMany({});
    console.log('Cleared existing data');

    // Create a simple test user
    try {
      const testUser = new User({
        firstName: 'Test',
        lastName: 'User',
        email: 'test@university.edu',
        studentId: '2024001',
        password: 'password123',
        balance: 100,
        isActive: true,
        lastLoginAt: new Date()
      });
      
      const savedUser = await testUser.save();
      console.log('Created test user:', savedUser._id);
      
      // Create a simple print job
      const testJob = new PrintJob({
        userId: savedUser._id,
        documentId: new mongoose.Types.ObjectId(),
        jobNumber: 'JOB001',
        fileName: 'test.pdf',
        totalPages: 5,
        pagesToPrint: 5,
        printCost: 10,
        status: 'pending_payment',
        paymentMethod: 'bkash',
        bkashTxnId: 'TXN001',
        logs: [{
          status: 'uploaded',
          timestamp: new Date(),
          message: 'Job created'
        }]
      });
      
      const savedJob = await testJob.save();
      console.log('Created test job:', savedJob._id);
      
      // Verify the data
      const userCount = await User.countDocuments();
      const jobCount = await PrintJob.countDocuments();
      
      console.log('Final counts:');
      console.log('- Users:', userCount);
      console.log('- Jobs:', jobCount);
      
    } catch (modelError) {
      console.error('Model error:', modelError);
    }
    
  } catch (error) {
    console.error('Connection error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected');
  }
}

createSimpleTestData();
const mongoose = require('mongoose');
const { User, PrintJob, Payment } = require('./src/models/mongodb');
require('dotenv').config();

async function createFullTestData() {
  try {
    const mongoUrl = process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017/autoprint';
    await mongoose.connect(mongoUrl);
    console.log('Connected to MongoDB Atlas');
    
    // Clear existing data
    await User.deleteMany({});
    await PrintJob.deleteMany({});
    await Payment.deleteMany({});
    console.log('Cleared existing data');

    // Create multiple users
    const users = [];
    for (let i = 1; i <= 10; i++) {
      const user = new User({
        firstName: `Student${i}`,
        lastName: `User${i}`,
        email: `student${i}@university.edu`,
        studentId: `2024${String(i).padStart(3, '0')}`,
        password: 'password123',
        balance: Math.floor(Math.random() * 200) + 50,
        isActive: true,
        lastLoginAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
      });
      
      const savedUser = await user.save();
      users.push(savedUser);
      console.log(`Created user ${i}: ${savedUser.email}`);
    }

    // Create print jobs for users
    const statuses = ['uploaded', 'pending_payment', 'payment_verification', 'queued', 'printing', 'printed', 'error'];
    const paymentMethods = ['bkash', 'balance', 'cash'];
    
    for (let i = 0; i < 20; i++) {
      const user = users[Math.floor(Math.random() * users.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
      
      const job = new PrintJob({
        userId: user._id,
        documentId: new mongoose.Types.ObjectId(),
        jobNumber: `JOB${String(i + 1).padStart(3, '0')}`,
        fileName: `document${i + 1}.pdf`,
        totalPages: Math.floor(Math.random() * 20) + 1,
        pagesToPrint: Math.floor(Math.random() * 15) + 1,
        printCost: Math.floor(Math.random() * 50) + 10,
        status: status,
        paymentMethod: paymentMethod,
        bkashTxnId: paymentMethod === 'bkash' ? `TXN${String(i + 1).padStart(6, '0')}` : null,
        logs: [{
          status: 'uploaded',
          timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
          message: 'Job created'
        }],
        createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
      });
      
      await job.save();
      console.log(`Created job ${i + 1}: ${job.jobNumber}`);
    }

    // Create payments
    for (let i = 0; i < 15; i++) {
      const user = users[Math.floor(Math.random() * users.length)];
      const paymentMethods = ['bkash', 'balance', 'cash'];
      const method = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
      
      const payment = new Payment({
        userId: user._id,
        amount: Math.floor(Math.random() * 100) + 20,
        paymentMethod: method,
        transactionId: `${method.toUpperCase()}${String(i + 1).padStart(6, '0')}`,
        status: Math.random() > 0.1 ? 'completed' : 'pending',
        description: `Balance top-up via ${method}`,
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
      });
      
      await payment.save();
      console.log(`Created payment ${i + 1}: ${payment.transactionId}`);
    }
    
    // Verify final counts
    const userCount = await User.countDocuments();
    const jobCount = await PrintJob.countDocuments();
    const paymentCount = await Payment.countDocuments();
    
    console.log('\n✅ Test data created successfully!');
    console.log(`- Users: ${userCount}`);
    console.log(`- Print Jobs: ${jobCount}`);
    console.log(`- Payments: ${paymentCount}`);
    
  } catch (error) {
    console.error('❌ Error creating test data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

createFullTestData();
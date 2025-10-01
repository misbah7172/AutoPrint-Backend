const mongoose = require('mongoose');
const { User, PrintJob, Payment } = require('./src/models/mongodb');

async function createTestData() {
  try {
    // Connect to MongoDB - use the same URL as the main app
    const mongoUrl = process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017/autoprint';
    await mongoose.connect(mongoUrl);
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await PrintJob.deleteMany({});
    await Payment.deleteMany({});
    console.log('Cleared existing data');

    // Create test users
    const users = [];
    for (let i = 1; i <= 10; i++) {
      const user = new User({
        firstName: `Student`,
        lastName: `${i}`,
        email: `student${i}@university.edu`,
        studentId: `2024${i.toString().padStart(3, '0')}`,
        password: 'password123',
        balance: Math.floor(Math.random() * 100) + 50,
        isActive: true,
        lastLoginAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
      });
      await user.save();
      users.push(user);
    }
    console.log('Created test users');

    // Create test print jobs with various statuses
    const statuses = ['pending_payment', 'queued', 'printing', 'printed', 'error'];
    const fileNames = ['Assignment1.pdf', 'Report.docx', 'Notes.pdf', 'Project.pdf', 'Slides.pptx'];
    
    let serialNumber = 1;
    
    for (let i = 0; i < 25; i++) {
      const user = users[Math.floor(Math.random() * users.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const fileName = fileNames[Math.floor(Math.random() * fileNames.length)];
      const pages = Math.floor(Math.random() * 20) + 1;
      const amount = pages * 2; // 2 taka per page
      
      const job = new PrintJob({
        userId: user._id,
        documentId: new mongoose.Types.ObjectId(), // Generate a fake document ID
        jobNumber: `JOB${Date.now()}${i}`,
        fileName,
        fileSize: Math.floor(Math.random() * 5000000) + 100000, // 100KB to 5MB
        totalPages: pages,
        pagesToPrint: pages,
        printCost: amount,
        status,
        serialNumber: status === 'queued' || status === 'printing' ? serialNumber++ : undefined,
        paymentMethod: 'bkash',
        bkashTxnId: `TXN${Date.now()}${i}`,
        createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Last 7 days
        printedAt: status === 'printed' ? new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000) : undefined,
        logs: [{
          status: 'uploaded',
          timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
          message: 'Job created'
        }]
      });
      
      await job.save();
    }
    console.log('Created test print jobs');

    // Create test payments
    for (let i = 0; i < 15; i++) {
      const user = users[Math.floor(Math.random() * users.length)];
      const payment = new Payment({
        userId: user._id,
        amount: Math.floor(Math.random() * 200) + 50,
        paymentMethod: 'bkash',
        transactionId: `PAY${Date.now()}${i}`,
        status: Math.random() > 0.3 ? 'completed' : 'pending',
        createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
      });
      await payment.save();
    }
    console.log('Created test payments');

    console.log('✅ Test data created successfully!');
    
    // Print summary
    const stats = {
      users: await User.countDocuments(),
      printJobs: await PrintJob.countDocuments(),
      payments: await Payment.countDocuments(),
      pendingPayments: await PrintJob.countDocuments({ status: 'pending_payment' }),
      queuedJobs: await PrintJob.countDocuments({ status: 'queued' }),
      printingJobs: await PrintJob.countDocuments({ status: 'printing' })
    };
    
    console.log('📊 Database Summary:');
    console.log(`Users: ${stats.users}`);
    console.log(`Print Jobs: ${stats.printJobs}`);
    console.log(`Payments: ${stats.payments}`);
    console.log(`Pending Payments: ${stats.pendingPayments}`);
    console.log(`Queued Jobs: ${stats.queuedJobs}`);
    console.log(`Printing Jobs: ${stats.printingJobs}`);
    
  } catch (error) {
    console.error('Error creating test data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

createTestData();
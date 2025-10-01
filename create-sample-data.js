const { User, Document, PrintJob, Payment, sequelize } = require('./src/models');
const bcrypt = require('bcryptjs');

async function createSampleData() {
  try {
    console.log('🔄 Creating sample data for testing...');
    
    // Clear existing data except admin
    await PrintJob.destroy({ where: {} });
    await Payment.destroy({ where: {} });
    await Document.destroy({ where: {} });
    await User.destroy({ where: { role: { [sequelize.Sequelize.Op.ne]: 'admin' } } });
    
    console.log('🧹 Cleared existing sample data');
    
    // Create sample students
    const students = [];
    for (let i = 1; i <= 10; i++) {
      const student = await User.create({
        email: `student${i}@university.ac.bd`,
        password: 'student123',
        firstName: `Student`,
        lastName: `User${i}`,
        studentId: `2021000${i.toString().padStart(3, '0')}`,
        role: 'student',
        balance: Math.floor(Math.random() * 1000) + 100, // Random balance 100-1100
        isActive: true,
        authProvider: i <= 5 ? 'google' : 'local', // Mix of auth providers
        photoUrl: i <= 5 ? `https://lh3.googleusercontent.com/a/student${i}` : null,
        firebaseUid: i <= 5 ? `firebase_uid_student_${i}` : null
      });
      students.push(student);
    }
    
    console.log(`✅ Created ${students.length} sample students`);
    
    // Create sample documents
    const documents = [];
    const documentTypes = ['PDF', 'DOCX', 'TXT', 'PNG', 'JPG'];
    const documentNames = [
      'Assignment_1.pdf', 'Thesis_Chapter_1.docx', 'Lab_Report.pdf',
      'Project_Proposal.pdf', 'Resume.docx', 'Cover_Letter.pdf',
      'Research_Paper.pdf', 'Presentation.pdf', 'Notes.txt', 'Diagram.png'
    ];
    
    for (let i = 0; i < 25; i++) {
      const student = students[Math.floor(Math.random() * students.length)];
      const docName = documentNames[Math.floor(Math.random() * documentNames.length)];
      const fileType = documentTypes[Math.floor(Math.random() * documentTypes.length)];
      
      const document = await Document.create({
        userId: student.id,
        originalName: `${docName.split('.')[0]}_${i}.${fileType.toLowerCase()}`,
        fileName: `doc_${Date.now()}_${i}.${fileType.toLowerCase()}`,
        fileSize: Math.floor(Math.random() * 5000000) + 100000, // 100KB - 5MB
        mimeType: `application/${fileType.toLowerCase()}`,
        s3Key: `documents/doc_${Date.now()}_${i}.${fileType.toLowerCase()}`,
        s3Bucket: 'autoprint-documents',
        pageCount: Math.floor(Math.random() * 20) + 1,
        printSettings: {
          copies: Math.floor(Math.random() * 5) + 1,
          colorMode: Math.random() > 0.7 ? 'color' : 'black_and_white',
          paperSize: 'A4',
          orientation: Math.random() > 0.8 ? 'landscape' : 'portrait',
          duplex: Math.random() > 0.5
        },
        uploadStatus: 'completed',
        processingStatus: 'ready'
      });
      documents.push(document);
    }
    
    console.log(`✅ Created ${documents.length} sample documents`);
    
    // Create sample payments
    const payments = [];
    const paymentMethods = ['bkash', 'card', 'balance', 'transfer'];
    const paymentStatuses = ['completed', 'pending', 'verified', 'failed'];
    
    for (let i = 0; i < 20; i++) {
      const student = students[Math.floor(Math.random() * students.length)];
      const method = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
      const status = paymentStatuses[Math.floor(Math.random() * paymentStatuses.length)];
      
      const payment = await Payment.create({
        userId: student.id,
        amount: (Math.random() * 50 + 5).toFixed(2), // $5-$55
        currency: 'BDT',
        status: status,
        paymentMethod: method,
        transactionId: `TXN_${Date.now()}_${i}`,
        txId: method === 'bkash' ? `BKA${Math.random().toString().substr(2, 8)}` : null,
        verificationDetails: status === 'verified' ? {
          verifiedBy: 'admin',
          verifiedAt: new Date(),
          notes: 'Payment verified successfully'
        } : null,
        metadata: {
          description: `Payment for printing services`,
          platform: 'mobile_app'
        }
      });
      payments.push(payment);
    }
    
    console.log(`✅ Created ${payments.length} sample payments`);
    
    // Create sample print jobs
    const printJobs = [];
    const jobStatuses = ['completed', 'queued', 'printing', 'awaiting_payment', 'failed'];
    
    for (let i = 0; i < 30; i++) {
      const document = documents[Math.floor(Math.random() * documents.length)];
      const payment = Math.random() > 0.3 ? payments[Math.floor(Math.random() * payments.length)] : null;
      const status = jobStatuses[Math.floor(Math.random() * jobStatuses.length)];
      
      const printJob = await PrintJob.create({
        userId: document.userId,
        documentId: document.id,
        paymentId: payment?.id || null,
        jobNumber: `PJ${Date.now().toString().substr(-6)}${i.toString().padStart(2, '0')}`,
        status: status,
        upid: Math.random().toString(36).substr(2, 8).toUpperCase(),
        copies: Math.floor(Math.random() * 5) + 1,
        totalPages: document.pageCount * (Math.floor(Math.random() * 5) + 1),
        totalCost: parseFloat((document.pageCount * 2.0 * (Math.floor(Math.random() * 5) + 1)).toFixed(2)),
        costPerPage: 2.0,
        paperSize: 'A4',
        orientation: 'portrait',
        doubleSided: Math.random() > 0.5,
        printQuality: 'normal',
        colorMode: Math.random() > 0.7 ? 'color' : 'black_and_white',
        queuePosition: status === 'queued' ? Math.floor(Math.random() * 10) + 1 : null,
        estimatedCompletionTime: status === 'printing' || status === 'queued' 
          ? new Date(Date.now() + Math.random() * 3600000) // Within 1 hour
          : null,
        completedAt: status === 'completed' 
          ? new Date(Date.now() - Math.random() * 86400000) // Within last day
          : null,
        startedAt: (status === 'completed' || status === 'printing') 
          ? new Date(Date.now() - Math.random() * 86400000) // Within last day
          : null,
        metadata: {
          printDuration: status === 'completed' ? Math.floor(Math.random() * 3600) : null,
          paperUsed: document.pageCount,
          estimatedDuration: Math.floor(Math.random() * 1800) + 300
        }
      });
      printJobs.push(printJob);
    }
    
    console.log(`✅ Created ${printJobs.length} sample print jobs`);
    
    // Update user balances based on completed payments
    for (const student of students) {
      const completedPayments = await Payment.sum('amount', {
        where: { 
          userId: student.id, 
          status: 'completed' 
        }
      });
      
      if (completedPayments) {
        await student.update({ 
          balance: parseFloat(student.balance || 0) + parseFloat(completedPayments || 0)
        });
      }
    }
    
    console.log('✅ Updated student balances');
    
    // Create summary
    const summary = {
      students: students.length,
      documents: documents.length,
      payments: payments.length,
      printJobs: printJobs.length,
      totalRevenue: payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0).toFixed(2)
    };
    
    console.log('📊 Sample Data Summary:');
    console.log(`   👥 Students: ${summary.students}`);
    console.log(`   📄 Documents: ${summary.documents}`);
    console.log(`   💳 Payments: ${summary.payments}`);
    console.log(`   🖨️ Print Jobs: ${summary.printJobs}`);
    console.log(`   💰 Total Revenue: $${summary.totalRevenue}`);
    
    console.log('✅ Sample data creation completed successfully!');
    
  } catch (error) {
    console.error('❌ Error creating sample data:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  createSampleData()
    .then(() => {
      console.log('🎉 Sample data creation finished!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Sample data creation failed:', error);
      process.exit(1);
    });
}

module.exports = createSampleData;
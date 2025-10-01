#!/usr/bin/env node

/**
 * MongoDB Database Setup Script
 * This script initializes MongoDB with collections and sample data
 */

const { database, User, Document, Payment, PrintJob } = require('./src/models/mongodb');

async function setupMongoDB() {
  try {
    console.log('🚀 Starting MongoDB database setup...');
    
    // Connect to MongoDB
    await database.connect();
    
    // Clear existing data (for fresh setup)
    console.log('🧹 Clearing existing data...');
    await Promise.all([
      User.deleteMany({}),
      Document.deleteMany({}),
      Payment.deleteMany({}),
      PrintJob.deleteMany({})
    ]);
    console.log('✅ Existing data cleared');
    
    console.log('🌱 Seeding database with sample data...');
    
    // Create sample users
    const users = await User.create([
      {
        email: 'admin@autoprint.com',
        password: 'password123',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        balance: 0.00,
        isActive: true,
        emailVerifiedAt: new Date()
      },
      {
        email: 'operator@autoprint.com',
        password: 'password123',
        firstName: 'Print',
        lastName: 'Operator',
        role: 'operator',
        balance: 0.00,
        isActive: true,
        emailVerifiedAt: new Date()
      },
      {
        email: 'student1@university.edu',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        role: 'student',
        studentId: 'STU2024001',
        balance: 25.00,
        isActive: true,
        emailVerifiedAt: new Date()
      },
      {
        email: 'student2@university.edu',
        password: 'password123',
        firstName: 'Jane',
        lastName: 'Smith',
        role: 'student',
        studentId: 'STU2024002',
        balance: 15.50,
        isActive: true,
        emailVerifiedAt: new Date()
      },
      {
        email: 'student3@university.edu',
        password: 'password123',
        firstName: 'Alice',
        lastName: 'Johnson',
        role: 'student',
        studentId: 'STU2024003',
        balance: 10.75,
        isActive: true,
        emailVerifiedAt: new Date()
      },
      {
        email: 'student4@university.edu',
        password: 'password123',
        firstName: 'Bob',
        lastName: 'Wilson',
        role: 'student',
        studentId: 'STU2024004',
        balance: 0.00,
        isActive: true,
        emailVerifiedAt: new Date()
      }
    ]);
    console.log('✅ Created sample users');
    
    // Create sample documents
    const documents = await Document.create([
      {
        userId: users[2]._id, // John Doe
        originalName: 'Assignment_1.pdf',
        fileName: 'assignment_1_john_doe_2024.pdf',
        fileSize: 1024576,
        mimeType: 'application/pdf',
        s3Key: 'documents/2024/assignment_1_john_doe_2024.pdf',
        s3Bucket: 'autoprint-documents',
        pageCount: 5,
        documentType: 'pdf',
        isProcessed: true,
        metadata: { originalUploadName: 'Assignment_1.pdf', processingTime: 2.3 }
      },
      {
        userId: users[3]._id, // Jane Smith
        originalName: 'Research_Paper.docx',
        fileName: 'research_paper_jane_smith_2024.pdf',
        fileSize: 2048576,
        mimeType: 'application/pdf',
        s3Key: 'documents/2024/research_paper_jane_smith_2024.pdf',
        s3Bucket: 'autoprint-documents',
        pageCount: 12,
        documentType: 'pdf',
        isProcessed: true,
        metadata: { originalUploadName: 'Research_Paper.docx', convertedFromDocx: true, processingTime: 4.7 }
      },
      {
        userId: users[4]._id, // Alice Johnson
        originalName: 'Lab_Report.pdf',
        fileName: 'lab_report_alice_johnson_2024.pdf',
        fileSize: 1536000,
        mimeType: 'application/pdf',
        s3Key: 'documents/2024/lab_report_alice_johnson_2024.pdf',
        s3Bucket: 'autoprint-documents',
        pageCount: 8,
        documentType: 'pdf',
        isProcessed: true,
        metadata: { originalUploadName: 'Lab_Report.pdf', processingTime: 3.1 }
      },
      {
        userId: users[5]._id, // Bob Wilson
        originalName: 'Presentation_Slides.pdf',
        fileName: 'presentation_slides_bob_wilson_2024.pdf',
        fileSize: 3072000,
        mimeType: 'application/pdf',
        s3Key: 'documents/2024/presentation_slides_bob_wilson_2024.pdf',
        s3Bucket: 'autoprint-documents',
        pageCount: 20,
        documentType: 'pdf',
        isProcessed: true,
        metadata: { originalUploadName: 'Presentation_Slides.pdf', processingTime: 5.2 }
      }
    ]);
    console.log('✅ Created sample documents');
    
    // Create sample payments
    const payments = await Payment.create([
      {
        userId: users[2]._id, // John Doe
        amount: 0.25,
        currency: 'USD',
        status: 'completed',
        paymentMethod: 'balance',
        transactionId: 'TXN_2024_001',
        processedAt: new Date(),
        notes: 'Payment for Assignment_1.pdf printing'
      },
      {
        userId: users[3]._id, // Jane Smith
        amount: 0.60,
        currency: 'USD',
        status: 'completed',
        paymentMethod: 'bkash',
        transactionId: 'TXN_2024_002',
        txId: 'BKS123456789',
        bkashNumber: '+8801711223344',
        processedAt: new Date(),
        notes: 'Payment for Research_Paper.docx printing',
        gatewayData: { bkash_transaction_id: 'BKS123456789', sender_number: '+8801711223344' }
      },
      {
        userId: users[4]._id, // Alice Johnson
        amount: 0.40,
        currency: 'USD',
        status: 'pending',
        paymentMethod: 'bkash',
        transactionId: 'TXN_2024_003',
        bkashNumber: '+8801712345678',
        qrCode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
        notes: 'Payment for Lab_Report.pdf printing',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000)
      },
      {
        userId: users[5]._id, // Bob Wilson
        amount: 1.00,
        currency: 'USD',
        status: 'failed',
        paymentMethod: 'balance',
        transactionId: 'TXN_2024_004',
        notes: 'Insufficient balance for Presentation_Slides.pdf printing'
      }
    ]);
    console.log('✅ Created sample payments');
    
    // Create sample print jobs
    const printJobs = await PrintJob.create([
      {
        userId: users[2]._id, // John Doe
        documentId: documents[0]._id,
        paymentId: payments[0]._id,
        jobNumber: 'APR-2024-001',
        upid: 'ABC12345',
        status: 'completed',
        copies: 1,
        paperSize: 'A4',
        orientation: 'portrait',
        colorMode: 'blackwhite',
        printQuality: 'normal',
        doubleSided: false,
        pageRange: '1-5',
        totalPages: 5,
        costPerPage: 0.05,
        totalCost: 0.25,
        printerName: 'HP LaserJet Pro M404dn',
        printerId: 'printer_001',
        priority: 'normal',
        startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        completedAt: new Date(Date.now() - 1.5 * 60 * 60 * 1000),
        specialInstructions: 'Please staple the pages together',
        metadata: { printDuration: 1800, paperUsed: 5 }
      },
      {
        userId: users[3]._id, // Jane Smith
        documentId: documents[1]._id,
        paymentId: payments[1]._id,
        jobNumber: 'APR-2024-002',
        upid: 'DEF67890',
        status: 'printing',
        copies: 2,
        paperSize: 'A4',
        orientation: 'portrait',
        colorMode: 'blackwhite',
        printQuality: 'high',
        doubleSided: true,
        pageRange: '1-12',
        totalPages: 24,
        costPerPage: 0.05,
        totalCost: 0.60,
        printerName: 'Canon PIXMA G3020',
        printerId: 'printer_002',
        queuePosition: 1,
        priority: 'normal',
        startedAt: new Date(Date.now() - 30 * 60 * 1000),
        estimatedCompletionTime: new Date(Date.now() + 10 * 60 * 1000),
        specialInstructions: 'Print double-sided, bind with spiral binding',
        metadata: { estimatedDuration: 2400, currentPage: 8 }
      },
      {
        userId: users[4]._id, // Alice Johnson
        documentId: documents[2]._id,
        paymentId: payments[2]._id,
        jobNumber: 'APR-2024-003',
        upid: 'GHI11111',
        status: 'awaiting_payment',
        copies: 1,
        paperSize: 'A4',
        orientation: 'portrait',
        colorMode: 'blackwhite',
        printQuality: 'normal',
        doubleSided: false,
        pageRange: '1-8',
        totalPages: 8,
        costPerPage: 0.05,
        totalCost: 0.40,
        priority: 'normal',
        specialInstructions: 'Use recycled paper if available',
        metadata: { awaitingPaymentSince: new Date() }
      }
    ]);
    console.log('✅ Created sample print jobs');
    
    console.log('🎉 MongoDB setup completed successfully!');
    console.log('');
    console.log('📊 Sample Data Created:');
    console.log(`   👥 Users: ${users.length} (1 admin, 1 operator, 4 students)`);
    console.log(`   📄 Documents: ${documents.length}`);
    console.log(`   💳 Payments: ${payments.length}`);
    console.log(`   🖨️  Print Jobs: ${printJobs.length}`);
    console.log('');
    console.log('🔐 Test Login Credentials:');
    console.log('   Admin: admin@autoprint.com / password123');
    console.log('   Student: student1@university.edu / password123');
    console.log('   Student: student2@university.edu / password123');
    console.log('');
    
    // Show database stats
    const stats = await database.getConnection().db.stats();
    console.log('📈 Database Statistics:');
    console.log(`   📁 Collections: ${stats.collections}`);
    console.log(`   📊 Documents: ${stats.objects}`);
    console.log(`   💾 Data Size: ${(stats.dataSize / 1024).toFixed(2)} KB`);
    console.log('');
    
  } catch (error) {
    console.error('❌ MongoDB setup failed:', error);
    process.exit(1);
  } finally {
    await database.disconnect();
    console.log('📡 Database connection closed');
    process.exit(0);
  }
}

// Run the setup
setupMongoDB();
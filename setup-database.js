#!/usr/bin/env node

/**
 * Database Setup Script
 * This script initializes the database with tables and sample data
 */

const { sequelize } = require('./src/models');

async function setupDatabase() {
  try {
    console.log('🚀 Starting database setup...');
    
    // Test database connection
    console.log('📡 Testing database connection...');
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully');
    
    // Sync all models (create tables)
    console.log('🏗️  Creating database tables...');
    await sequelize.sync({ force: true }); // WARNING: This drops existing tables
    console.log('✅ Database tables created successfully');
    
    // Import models
    const { User, Document, Payment, PrintJob } = require('./src/models');
    
    console.log('🌱 Seeding database with sample data...');
    
    // Create sample users
    const users = await User.bulkCreate([
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
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
        id: '550e8400-e29b-41d4-a716-446655440001',
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
        id: '550e8400-e29b-41d4-a716-446655440002',
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
        id: '550e8400-e29b-41d4-a716-446655440003',
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
        id: '550e8400-e29b-41d4-a716-446655440004',
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
        id: '550e8400-e29b-41d4-a716-446655440005',
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
    const documents = await Document.bulkCreate([
      {
        id: '660e8400-e29b-41d4-a716-446655440001',
        userId: '550e8400-e29b-41d4-a716-446655440002',
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
        id: '660e8400-e29b-41d4-a716-446655440002',
        userId: '550e8400-e29b-41d4-a716-446655440003',
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
        id: '660e8400-e29b-41d4-a716-446655440003',
        userId: '550e8400-e29b-41d4-a716-446655440004',
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
        id: '660e8400-e29b-41d4-a716-446655440004',
        userId: '550e8400-e29b-41d4-a716-446655440005',
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
    const payments = await Payment.bulkCreate([
      {
        id: '770e8400-e29b-41d4-a716-446655440001',
        userId: '550e8400-e29b-41d4-a716-446655440002',
        amount: 0.25,
        currency: 'USD',
        status: 'completed',
        paymentMethod: 'balance',
        transactionId: 'TXN_2024_001',
        processedAt: new Date(),
        notes: 'Payment for Assignment_1.pdf printing'
      },
      {
        id: '770e8400-e29b-41d4-a716-446655440002',
        userId: '550e8400-e29b-41d4-a716-446655440003',
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
        id: '770e8400-e29b-41d4-a716-446655440003',
        userId: '550e8400-e29b-41d4-a716-446655440004',
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
        id: '770e8400-e29b-41d4-a716-446655440004',
        userId: '550e8400-e29b-41d4-a716-446655440005',
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
    const printJobs = await PrintJob.bulkCreate([
      {
        id: '880e8400-e29b-41d4-a716-446655440001',
        userId: '550e8400-e29b-41d4-a716-446655440002',
        documentId: '660e8400-e29b-41d4-a716-446655440001',
        paymentId: '770e8400-e29b-41d4-a716-446655440001',
        jobNumber: 'APR-2024-001',
        status: 'completed',
        upid: 'A1B2C3D4',
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
        id: '880e8400-e29b-41d4-a716-446655440002',
        userId: '550e8400-e29b-41d4-a716-446655440003',
        documentId: '660e8400-e29b-41d4-a716-446655440002',
        paymentId: '770e8400-e29b-41d4-a716-446655440002',
        jobNumber: 'APR-2024-002',
        status: 'printing',
        upid: 'E5F6G7H8',
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
        id: '880e8400-e29b-41d4-a716-446655440003',
        userId: '550e8400-e29b-41d4-a716-446655440004',
        documentId: '660e8400-e29b-41d4-a716-446655440003',
        paymentId: '770e8400-e29b-41d4-a716-446655440003',
        jobNumber: 'APR-2024-003',
        status: 'awaiting_payment',
        upid: 'I9J0K1L2',
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
    
    console.log('🎉 Database setup completed successfully!');
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
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
    console.log('📡 Database connection closed');
    process.exit(0);
  }
}

// Run the setup
setupDatabase();
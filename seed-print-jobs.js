const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const { User, PrintJob, Document } = require('./src/models/mongodb');

async function seedPrintJobs() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/autoprint');
    console.log('Connected to MongoDB');

    // Find a test user (you can replace with actual user ID)
    const testUser = await User.findOne({ email: { $regex: /ac\.bd$/ } });
    
    if (!testUser) {
      console.log('No university user found. Please sign up with a university email ending in ac.bd first.');
      return;
    }

    console.log('Found test user:', testUser.email);

    // Create sample documents
    const sampleDocs = [
      { fileName: 'Assignment_1.pdf', pages: 5 },
      { fileName: 'Research_Paper.docx', pages: 12 },
      { fileName: 'Lab_Report.pdf', pages: 8 },
      { fileName: 'Presentation.pptx', pages: 15 },
      { fileName: 'Notes.pdf', pages: 3 }
    ];

    const documents = [];
    for (const docInfo of sampleDocs) {
      const doc = new Document({
        userId: testUser._id,
        fileName: docInfo.fileName,
        fileSize: Math.floor(Math.random() * 1000000) + 100000, // Random file size
        mimeType: docInfo.fileName.endsWith('.pdf') ? 'application/pdf' : 
                  docInfo.fileName.endsWith('.docx') ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' :
                  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        filePath: `/uploads/${docInfo.fileName}`,
        status: 'processed',
        pageCount: docInfo.pages,
        uploadedAt: new Date()
      });
      await doc.save();
      documents.push(doc);
    }

    // Create print jobs with different statuses
    const statusOptions = [
      'uploaded',
      'pending_payment', 
      'payment_verification',
      'queued',
      'waiting_confirmation',
      'printing',
      'printed',
      'error'
    ];

    let serialCounter = 1;

    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      const status = statusOptions[i % statusOptions.length];
      
      const printJob = new PrintJob({
        userId: testUser._id,
        documentId: doc._id,
        fileName: doc.fileName,
        jobNumber: `PJ${Date.now()}${i}`,
        status: status,
        serialNumber: ['queued', 'waiting_confirmation', 'printing'].includes(status) ? serialCounter++ : undefined,
        copies: Math.floor(Math.random() * 3) + 1,
        paperSize: 'A4',
        orientation: 'portrait',
        colorMode: 'blackwhite',
        printQuality: 'normal',
        doubleSided: false,
        totalPages: doc.pageCount,
        costPerPage: 0.05,
        totalCost: doc.pageCount * 0.05,
        createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random time in last 7 days
        updatedAt: new Date()
      });

      await printJob.save();
      console.log(`Created print job: ${printJob.fileName} - Status: ${printJob.status} - Serial: ${printJob.serialNumber || 'N/A'}`);
    }

    console.log('\n✅ Sample print jobs created successfully!');
    console.log('You can now test the print tracking functionality in the app.');

  } catch (error) {
    console.error('Error seeding print jobs:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

seedPrintJobs();
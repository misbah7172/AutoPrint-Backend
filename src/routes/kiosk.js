const express = require('express');
const { User, Document, PrintJob } = require('../models/mongodb');
const { asyncHandler } = require('../middleware/asyncHandler');

const router = express.Router();

// Middleware to check API key for kiosk requests
const checkApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.headers['authorization'];
  
  // For development, allow requests without API key or use simple key
  if (process.env.NODE_ENV === 'development') {
    return next();
  }
  
  if (!apiKey || apiKey !== process.env.KIOSK_API_KEY) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or missing API key'
    });
  }
  
  next();
};

// POST /api/kiosk/submit-job - Submit print job from kiosk
router.post('/submit-job', checkApiKey, asyncHandler(async (req, res) => {
  const { upid, documentId, copies = 1, priority = 'normal' } = req.body;
  
  console.log(`📱 Kiosk job submission - UPID: ${upid}, Document: ${documentId}`);
  
  // Validation
  if (!upid || !documentId) {
    return res.status(400).json({
      success: false,
      error: 'UPID and Document ID are required'
    });
  }

  // Find user
  const user = await User.findOne({ upid: upid.toUpperCase() });
  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'Student not found'
    });
  }

  // Find document
  const document = await Document.findById(documentId);
  if (!document) {
    return res.status(404).json({
      success: false,
      error: 'Document not found'
    });
  }

  // Check if document belongs to user (or is public)
  if (document.userId.toString() !== user._id.toString() && !document.isPublic) {
    return res.status(403).json({
      success: false,
      error: 'Access denied to this document'
    });
  }

  // Calculate cost
  const costPerPage = 0.10; // $0.10 per page
  const totalCost = document.pages * copies * costPerPage;

  // Check user balance
  if ((user.balance || 0) < totalCost) {
    return res.status(400).json({
      success: false,
      error: 'Insufficient balance',
      required: totalCost,
      available: user.balance || 0
    });
  }

  // Create print job
  const printJob = new PrintJob({
    userId: user._id,
    documentId: document._id,
    title: document.name,
    pages: document.pages,
    copies: parseInt(copies),
    cost: totalCost,
    status: 'pending',
    priority: priority,
    submittedVia: 'kiosk',
    metadata: {
      kioskSubmission: true,
      submittedAt: new Date(),
      upid: user.upid
    }
  });

  await printJob.save();

  // Deduct cost from user balance
  user.balance = (user.balance || 0) - totalCost;
  await user.save();

  console.log(`✅ Print job created: ${printJob._id} for ${user.firstName} ${user.lastName}`);

  // Emit socket event for real-time updates
  const io = req.app.get('io');
  if (io) {
    io.to(`user-${user._id}`).emit('job-submitted', {
      jobId: printJob._id,
      title: printJob.title,
      status: printJob.status,
      cost: printJob.cost
    });
    
    io.to('admin').emit('new-job', {
      jobId: printJob._id,
      user: `${user.firstName} ${user.lastName}`,
      title: printJob.title,
      pages: printJob.pages,
      copies: printJob.copies,
      submittedVia: 'kiosk'
    });
  }

  res.status(201).json({
    success: true,
    message: 'Print job submitted successfully',
    job: {
      id: printJob._id,
      title: printJob.title,
      pages: printJob.pages,
      copies: printJob.copies,
      cost: printJob.cost,
      status: printJob.status,
      queuePosition: await getQueuePosition(printJob._id),
      estimatedTime: calculateEstimatedTime(printJob.pages * printJob.copies)
    },
    user: {
      remainingBalance: user.balance
    }
  });
}));

// GET /api/kiosk/user/:upid/documents - Get user's documents for kiosk
router.get('/user/:upid/documents', checkApiKey, asyncHandler(async (req, res) => {
  const { upid } = req.params;
  
  // Find user
  const user = await User.findOne({ upid: upid.toUpperCase() });
  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'Student not found'
    });
  }

  // Get user's documents
  const documents = await Document.find({ 
    userId: user._id,
    status: 'ready' // Only show ready documents
  }).sort({ uploadedAt: -1 });

  res.json({
    success: true,
    documents: documents.map(doc => ({
      id: doc._id,
      name: doc.name,
      pages: doc.pages,
      size: doc.size,
      uploadedAt: doc.uploadedAt,
      type: doc.type
    }))
  });
}));

// GET /api/kiosk/queue-status - Get current queue status
router.get('/queue-status', checkApiKey, asyncHandler(async (req, res) => {
  const pendingJobs = await PrintJob.countDocuments({ status: 'pending' });
  const processingJobs = await PrintJob.countDocuments({ status: 'processing' });
  
  // Calculate estimated wait time (assuming 2 minutes per job)
  const estimatedWaitMinutes = (pendingJobs + processingJobs) * 2;
  
  res.json({
    success: true,
    queue: {
      pending: pendingJobs,
      processing: processingJobs,
      total: pendingJobs + processingJobs,
      estimatedWaitMinutes
    }
  });
}));

// Helper function to get queue position
async function getQueuePosition(jobId) {
  const job = await PrintJob.findById(jobId);
  if (!job) return 0;
  
  const position = await PrintJob.countDocuments({
    status: 'pending',
    createdAt: { $lt: job.createdAt }
  });
  
  return position + 1;
}

// Helper function to calculate estimated time
function calculateEstimatedTime(totalPages) {
  // Estimate: 30 seconds per page
  const seconds = totalPages * 30;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
}

module.exports = router;
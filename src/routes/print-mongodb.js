const express = require('express');
const { PrintJob, Payment, User } = require('../models/mongodb');
const { asyncHandler } = require('../middleware/asyncHandler');
const jwt = require('jsonwebtoken');

const router = express.Router();

// Middleware to extract user from token
const extractUser = asyncHandler(async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ 
      success: false,
      error: 'No token provided' 
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-secret');
    const user = await User.findById(decoded.userId);
    
    if (!user || !user.isActive) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid token or user not found' 
      });
    }

    req.user = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role
    };
    
    next();
  } catch (error) {
    return res.status(401).json({ 
      success: false,
      error: 'Invalid token' 
    });
  }
});

// POST /api/print/create - Create a new print job
router.post('/create', extractUser, asyncHandler(async (req, res) => {
  const { 
    fileName, 
    pages, 
    copies = 1, 
    isColor = false, 
    isDoubleSided = false, 
    paperSize = 'A4' 
  } = req.body;
  
  const userId = req.user.userId;

  console.log('🖨️ Creating print job:', { userId, fileName, pages, copies, isColor, isDoubleSided });

  if (!fileName || !pages) {
    return res.status(400).json({ 
      success: false,
      error: 'File name and pages are required' 
    });
  }

  // Calculate cost (this should match the mobile app calculation)
  let pricePerPage = isColor ? 5.0 : 2.0; // ৳5 for color, ৳2 for B&W
  if (isDoubleSided) {
    pricePerPage *= 0.8; // 20% discount for double-sided
  }
  
  const totalPages = pages * copies;
  let totalCost = totalPages * pricePerPage;
  
  // Minimum charge
  if (totalCost < 5.0) {
    totalCost = 5.0;
  }

  // Create print job
  const printJob = new PrintJob({
    userId,
    fileName,
    pages: totalPages,
    copies,
    isColor,
    isDoubleSided,
    paperSize,
    totalCost,
    status: 'created',
    settings: {
      orientation: 'portrait',
      quality: 'standard'
    }
  });

  await printJob.save();

  console.log('✅ Print job created:', printJob._id);

  res.status(201).json({
    success: true,
    message: 'Print job created successfully',
    data: {
      id: printJob._id.toString(),
      fileName: printJob.fileName,
      pages: printJob.pages,
      copies: printJob.copies,
      isColor: printJob.isColor,
      isDoubleSided: printJob.isDoubleSided,
      paperSize: printJob.paperSize,
      totalCost: printJob.totalCost,
      status: printJob.status,
      createdAt: printJob.createdAt
    }
  });
}));

// GET /api/print/queue - Get user's print queue
router.get('/queue', extractUser, asyncHandler(async (req, res) => {
  const userId = req.user.userId;

  const printJobs = await PrintJob.find({ 
    userId,
    status: { $in: ['created', 'pending', 'processing', 'queued'] }
  })
  .sort({ createdAt: -1 })
  .lean();

  const enrichedJobs = await Promise.all(printJobs.map(async (job) => {
    // Find associated payment if any
    const payment = await Payment.findOne({ 
      userId,
      documentId: job.fileName,
      status: { $in: ['pending', 'verified'] }
    }).lean();

    return {
      id: job._id,
      fileName: job.fileName,
      pages: job.pages,
      copies: job.copies,
      isColor: job.isColor,
      isDoubleSided: job.isDoubleSided,
      paperSize: job.paperSize,
      totalCost: job.totalCost,
      status: job.status,
      createdAt: job.createdAt,
      upid: payment?.upid || null,
      paymentStatus: payment?.status || null
    };
  }));

  res.json({
    success: true,
    data: enrichedJobs
  });
}));

// GET /api/print/history - Get user's print history
router.get('/history', extractUser, asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const printJobs = await PrintJob.find({ userId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await PrintJob.countDocuments({ userId });

  // Enrich with payment data
  const enrichedJobs = await Promise.all(printJobs.map(async (job) => {
    const payment = await Payment.findOne({ 
      userId,
      documentId: job.fileName
    }).lean();

    return {
      id: job._id,
      fileName: job.fileName,
      pages: job.pages,
      copies: job.copies,
      isColor: job.isColor,
      isDoubleSided: job.isDoubleSided,
      paperSize: job.paperSize,
      amount: job.totalCost,
      status: job.status,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
      upid: payment?.upid || 'N/A',
      paymentStatus: payment?.status || 'none'
    };
  }));

  res.json({
    success: true,
    data: enrichedJobs,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
}));

// GET /api/print/job/:id - Get specific print job
router.get('/job/:id', extractUser, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;

  const printJob = await PrintJob.findOne({ _id: id, userId }).lean();
  
  if (!printJob) {
    return res.status(404).json({ 
      success: false,
      error: 'Print job not found' 
    });
  }

  // Find associated payment
  const payment = await Payment.findOne({ 
    userId,
    documentId: printJob.fileName
  }).lean();

  res.json({
    success: true,
    data: {
      id: printJob._id,
      fileName: printJob.fileName,
      pages: printJob.pages,
      copies: printJob.copies,
      isColor: printJob.isColor,
      isDoubleSided: printJob.isDoubleSided,
      paperSize: printJob.paperSize,
      totalCost: printJob.totalCost,
      status: printJob.status,
      createdAt: printJob.createdAt,
      completedAt: printJob.completedAt,
      upid: payment?.upid || null,
      paymentStatus: payment?.status || 'none'
    }
  });
}));

// DELETE /api/print/job/:id - Cancel a print job
router.delete('/job/:id', extractUser, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;

  const printJob = await PrintJob.findOne({ _id: id, userId });
  
  if (!printJob) {
    return res.status(404).json({ 
      success: false,
      error: 'Print job not found' 
    });
  }

  // Only allow cancellation if not yet processing
  if (['processing', 'completed'].includes(printJob.status)) {
    return res.status(400).json({ 
      success: false,
      error: 'Cannot cancel job that is already processing or completed' 
    });
  }

  printJob.status = 'cancelled';
  printJob.cancelledAt = new Date();
  await printJob.save();

  console.log('❌ Print job cancelled:', printJob._id);

  res.json({
    success: true,
    message: 'Print job cancelled successfully'
  });
}));

// GET /api/print/current - Get current print job and serial
router.get('/current', extractUser, asyncHandler(async (req, res) => {
  const userId = req.user.userId;

  // Get the user's most recent active print job
  const currentJob = await PrintJob.findOne({ 
    userId,
    status: { $nin: ['printed', 'cancelled', 'expired', 'error'] }
  }).sort({ createdAt: -1 });

  // Get the current serial being processed
  const currentSerial = await PrintJob.findOne({
    status: 'printing'
  }).select('serialNumber');

  res.json({
    success: true,
    job: currentJob,
    currentSerial: currentSerial?.serialNumber || 0
  });
}));

// GET /api/print/jobs - Get user's print jobs with pagination
router.get('/jobs', extractUser, asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const query = { userId };
  
  // Get total count
  const totalJobs = await PrintJob.countDocuments(query);
  
  // Get jobs with pagination
  const jobs = await PrintJob.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .select('fileName status serialNumber createdAt updatedAt pages copies totalCost');

  const totalPages = Math.ceil(totalJobs / limit);

  res.json({
    success: true,
    jobs,
    currentPage: page,
    totalPages,
    totalJobs,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1
  });
}));

// POST /api/print/confirm/:id - Confirm print job (student confirms they're ready)
router.post('/confirm/:id', extractUser, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;

  const printJob = await PrintJob.findOne({ _id: id, userId });
  
  if (!printJob) {
    return res.status(404).json({ 
      success: false,
      error: 'Print job not found' 
    });
  }

  if (printJob.status !== 'waiting_confirmation') {
    return res.status(400).json({ 
      success: false,
      error: 'Job is not waiting for confirmation' 
    });
  }

  // Update job status to printing
  printJob.status = 'printing';
  printJob.updatedAt = new Date();
  await printJob.save();

  console.log('✅ Print job confirmed:', printJob._id);

  res.json({
    success: true,
    message: 'Print job confirmed and started printing'
  });
}));

// GET /api/print/queue - Get current print queue status
router.get('/queue', extractUser, asyncHandler(async (req, res) => {
  // Get queued jobs with serial numbers
  const queuedJobs = await PrintJob.find({ 
    status: 'queued' 
  })
  .populate('userId', 'name email')
  .sort({ serialNumber: 1 })
  .select('fileName serialNumber createdAt userId pages copies');

  // Get current printing job
  const currentlyPrinting = await PrintJob.findOne({ 
    status: 'printing' 
  })
  .populate('userId', 'name email')
  .select('fileName serialNumber createdAt userId pages copies');

  res.json({
    success: true,
    queue: queuedJobs,
    currentlyPrinting,
    queueLength: queuedJobs.length
  });
}));

module.exports = router;
const express = require('express');
const rateLimit = require('express-rate-limit');
const { PrintJob, User } = require('../models');
const { asyncHandler } = require('../middleware/asyncHandler');
const { authenticate, requireRole } = require('../middleware/auth');
const { validateUPIDExists } = require('../services/upidService');
const { 
  getUserQueuePosition, 
  getNextJobsInQueue,
  getCurrentJob 
} = require('../services/queueService');

const router = express.Router();

// Rate limiting for confirmation endpoint
const confirmLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // limit each IP to 5 confirmation requests per minute
  message: 'Too many confirmation attempts, please try again later.'
});

// GET /api/queue/status/:user_id - Get user's queue position and next jobs
router.get('/status/:user_id', authenticate, asyncHandler(async (req, res) => {
  const { user_id } = req.params;
  
  // Check if user is requesting their own status or is admin
  if (req.user.userId !== user_id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  // Get user's position in queue
  const userPosition = await getUserQueuePosition(user_id);
  
  // Get next few jobs in queue
  const nextJobs = await getNextJobsInQueue(5, userPosition ? userPosition.position : 1);
  
  // Get current job being processed
  const currentJob = await getCurrentJob();
  
  res.json({
    userPosition: userPosition,
    currentJob: currentJob ? {
      position: currentJob.queuePosition,
      status: currentJob.status,
      upid: currentJob.upid,
      user: {
        name: `${currentJob.user.firstName} ${currentJob.user.lastName}`,
        studentId: currentJob.user.studentId
      }
    } : null,
    nextJobs: nextJobs,
    totalInQueue: nextJobs.length > 0 ? Math.max(...nextJobs.map(j => j.position)) : 0
  });
}));

// POST /api/queue/confirm - Confirm print job when called by user
router.post('/confirm', confirmLimiter, asyncHandler(async (req, res) => {
  const { upid, user_id } = req.body;
  
  if (!upid || !user_id) {
    return res.status(400).json({ error: 'UPID and user_id are required' });
  }
  
  // Validate UPID
  const upidValidation = await validateUPIDExists(upid);
  if (!upidValidation.valid) {
    return res.status(400).json({ error: upidValidation.error });
  }
  
  const printJob = upidValidation.printJob;
  
  // Check if job belongs to the user
  if (printJob.userId !== user_id) {
    return res.status(403).json({ error: 'This print job does not belong to you' });
  }
  
  // Check if job is waiting for confirmation
  if (printJob.status !== 'waiting_for_confirm') {
    return res.status(400).json({ 
      error: 'Job is not waiting for confirmation',
      currentStatus: printJob.status 
    });
  }
  
  // Update job status to printing
  await printJob.update({
    status: 'printing',
    startedAt: new Date(),
    metadata: {
      ...printJob.metadata,
      confirmedAt: new Date(),
      confirmedBy: user_id
    }
  });
  
  // Get print metadata
  const printMetadata = {
    upid: printJob.upid,
    jobId: printJob.id,
    document: {
      id: printJob.document.id,
      name: printJob.document.originalName,
      s3Key: printJob.document.s3Key,
      s3Bucket: printJob.document.s3Bucket,
      pageCount: printJob.document.pageCount
    },
    printOptions: printJob.printOptions,
    user: {
      name: printJob.user.getFullName(),
      studentId: printJob.user.studentId,
      email: printJob.user.email
    },
    cost: printJob.totalCost,
    startedAt: printJob.startedAt
  };
  
  // Emit real-time update
  const io = req.app.get('io');
  io.emit('jobConfirmed', {
    upid: printJob.upid,
    userId: user_id,
    status: 'printing'
  });
  
  res.json({
    message: 'Print job confirmed successfully',
    printMetadata: printMetadata
  });
}));

// GET /api/queue/current - Get current queue status (public endpoint)
router.get('/current', asyncHandler(async (req, res) => {
  const currentJob = await getCurrentJob();
  const nextJobs = await getNextJobsInQueue(10);
  
  res.json({
    currentJob: currentJob ? {
      position: currentJob.queuePosition,
      status: currentJob.status,
      upid: currentJob.upid,
      estimatedTime: currentJob.metadata?.estimatedTime || null
    } : null,
    queue: nextJobs.map(job => ({
      position: job.position,
      upid: job.upid,
      status: job.status,
      estimatedTime: job.estimatedTime
    })),
    queueLength: nextJobs.length
  });
}));

module.exports = router;
const express = require('express');
const { PrintJob, Document } = require('../models');
const { asyncHandler } = require('../middleware/asyncHandler');
const { validateUPIDExists, markUPIDUsed } = require('../services/upidService');
const { getSignedUrl } = require('../services/s3Service');
const { removeFromQueue } = require('../services/queueService');

const router = express.Router();

// Middleware to validate Raspberry Pi API key
const validateRaspiAuth = (req, res, next) => {
  const apiKey = req.header('X-API-KEY');
  const expectedApiKey = process.env.RASPI_API_KEY;
  
  if (!apiKey || apiKey !== expectedApiKey) {
    return res.status(401).json({ error: 'Invalid or missing API key' });
  }
  
  next();
};

// GET /api/print/fetch?upid=... - Raspberry Pi fetches print job data
router.get('/fetch', validateRaspiAuth, asyncHandler(async (req, res) => {
  const { upid } = req.query;
  
  if (!upid) {
    return res.status(400).json({ error: 'UPID parameter is required' });
  }
  
  // Validate UPID
  const upidValidation = await validateUPIDExists(upid);
  if (!upidValidation.valid) {
    return res.status(404).json({ error: upidValidation.error });
  }
  
  const printJob = upidValidation.printJob;
  
  // Check if job is ready for printing
  if (printJob.status !== 'printing') {
    return res.status(400).json({ 
      error: 'Job is not ready for printing',
      currentStatus: printJob.status 
    });
  }
  
  // Check if UPID has already been used (single-use enforcement)
  if (printJob.metadata?.upidUsed) {
    return res.status(400).json({ error: 'UPID has already been used' });
  }
  
  try {
    // Mark UPID as used
    const marked = await markUPIDUsed(upid);
    if (!marked) {
      return res.status(400).json({ error: 'UPID has already been used' });
    }
    
    // Generate signed URL for document download
    const signedUrl = await getSignedUrl(
      printJob.document.s3Key, 
      printJob.document.s3Bucket, 
      3600 // 1 hour expiry
    );
    
    // Prepare print metadata
    const printMetadata = {
      upid: printJob.upid,
      jobId: printJob.id,
      document: {
        downloadUrl: signedUrl,
        fileName: printJob.document.originalName,
        pageCount: printJob.document.pageCount,
        mimeType: printJob.document.mimeType,
        fileSize: printJob.document.fileSize
      },
      printOptions: printJob.printOptions,
      user: {
        name: printJob.user.getFullName(),
        studentId: printJob.user.studentId
      },
      jobDetails: {
        totalCost: printJob.totalCost,
        totalPages: printJob.totalPages,
        createdAt: printJob.createdAt,
        startedAt: printJob.startedAt
      }
    };
    
    // Log the fetch for audit purposes
    await printJob.update({
      metadata: {
        ...printJob.metadata,
        fetchedAt: new Date(),
        fetchedBy: 'raspi'
      }
    });
    
    res.json({
      success: true,
      printMetadata: printMetadata
    });
    
  } catch (error) {
    console.error('Error fetching print job:', error);
    res.status(500).json({ error: 'Failed to fetch print job data' });
  }
}));

// POST /api/print/complete - Mark print job as completed
router.post('/complete', validateRaspiAuth, asyncHandler(async (req, res) => {
  const { upid, success = true, error_message = null, pages_printed = null } = req.body;
  
  if (!upid) {
    return res.status(400).json({ error: 'UPID is required' });
  }
  
  // Validate UPID
  const upidValidation = await validateUPIDExists(upid);
  if (!upidValidation.valid) {
    return res.status(404).json({ error: upidValidation.error });
  }
  
  const printJob = upidValidation.printJob;
  
  // Check if job is in printing status
  if (printJob.status !== 'printing') {
    return res.status(400).json({ 
      error: 'Job is not in printing status',
      currentStatus: printJob.status 
    });
  }
  
  try {
    // Update job status based on success
    const newStatus = success ? 'completed' : 'failed';
    const updateData = {
      status: newStatus,
      completedAt: new Date(),
      metadata: {
        ...printJob.metadata,
        completedBy: 'raspi',
        pagesActuallyPrinted: pages_printed || printJob.totalPages,
        printSuccess: success
      }
    };
    
    if (error_message) {
      updateData.failureReason = error_message;
    }
    
    await printJob.update(updateData);
    
    // Remove from queue
    await removeFromQueue(printJob.id);
    
    // Schedule document deletion (after 24 hours for completed jobs)
    if (success) {
      const { scheduleDocumentDeletion } = require('../workers/documentCleanup');
      await scheduleDocumentDeletion(printJob.document.id, 24 * 60 * 60 * 1000); // 24 hours
    }
    
    // Emit real-time update
    const io = req.app.get('io');
    io.emit('jobCompleted', {
      upid: printJob.upid,
      userId: printJob.userId,
      status: newStatus,
      success: success
    });
    
    // Emit queue update
    const { getCurrentJob, getNextJobsInQueue } = require('../services/queueService');
    const currentJob = await getCurrentJob();
    const nextJobs = await getNextJobsInQueue(5);
    
    io.emit('queueUpdate', {
      currentJob: currentJob,
      nextJobs: nextJobs
    });
    
    res.json({
      success: true,
      message: `Print job ${success ? 'completed' : 'failed'} successfully`,
      jobStatus: newStatus
    });
    
  } catch (error) {
    console.error('Error completing print job:', error);
    res.status(500).json({ error: 'Failed to complete print job' });
  }
}));

// POST /api/print/status - Update print job status (for intermediate updates)
router.post('/status', validateRaspiAuth, asyncHandler(async (req, res) => {
  const { upid, status, progress = null, message = null } = req.body;
  
  if (!upid || !status) {
    return res.status(400).json({ error: 'UPID and status are required' });
  }
  
  // Validate UPID
  const upidValidation = await validateUPIDExists(upid);
  if (!upidValidation.valid) {
    return res.status(404).json({ error: upidValidation.error });
  }
  
  const printJob = upidValidation.printJob;
  
  // Update job metadata with status information
  const updatedMetadata = {
    ...printJob.metadata,
    lastStatusUpdate: new Date(),
    printProgress: progress,
    statusMessage: message
  };
  
  await printJob.update({
    metadata: updatedMetadata
  });
  
  // Emit real-time status update
  const io = req.app.get('io');
  io.emit('printProgress', {
    upid: printJob.upid,
    userId: printJob.userId,
    progress: progress,
    message: message,
    timestamp: new Date()
  });
  
  res.json({
    success: true,
    message: 'Status updated successfully'
  });
}));

// GET /api/print/health - Health check endpoint for Raspberry Pi
router.get('/health', validateRaspiAuth, asyncHandler(async (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date(),
    service: 'autoprint-api',
    version: '1.0.0'
  });
}));

module.exports = router;
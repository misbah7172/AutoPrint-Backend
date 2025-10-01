const express = require('express');
const { PrintJob, Document, User } = require('../models');
const { asyncHandler } = require('../middleware/asyncHandler');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

// POST /api/print-jobs - Create print job with 'awaiting_payment' status and return payment instructions
router.post('/', asyncHandler(async (req, res) => {
  const { documentId, printOptions = {} } = req.body;

  // Validate document exists and belongs to user
  const document = await Document.findOne({
    where: { 
      id: documentId, 
      userId: req.user.userId,
      status: 'ready'
    }
  });

  if (!document) {
    return res.status(404).json({ error: 'Document not found or not ready for printing' });
  }

  // Create print job with awaiting_payment status
  const printJob = await PrintJob.create({
    userId: req.user.userId,
    documentId: document.id,
    status: 'awaiting_payment',
    printOptions: {
      copies: printOptions.copies || 1,
      color: printOptions.color || false,
      doubleSided: printOptions.doubleSided || false,
      paperSize: printOptions.paperSize || 'A4',
      orientation: printOptions.orientation || 'portrait',
      quality: printOptions.quality || 'normal'
    },
    totalPages: document.pageCount * (printOptions.copies || 1),
    totalCost: 0 // Will be calculated
  });

  // Calculate cost
  printJob.totalCost = printJob.calculateCost();
  await printJob.save();

  // Generate payment instructions with bKash QR code
  const { generatePaymentInstructions } = require('../services/qrService');
  const paymentInstructions = await generatePaymentInstructions(printJob);

  res.status(201).json({
    message: 'Print job created successfully',
    printJob: {
      id: printJob.id,
      jobNumber: printJob.jobNumber,
      status: printJob.status,
      totalCost: printJob.totalCost,
      totalPages: printJob.totalPages,
      printOptions: printJob.printOptions,
      createdAt: printJob.createdAt
    },
    paymentInstructions: paymentInstructions
  });
}));

// GET /api/print-jobs
router.get('/', asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status } = req.query;
  
  const where = { userId: req.user.userId };
  if (status) where.status = status;

  const printJobs = await PrintJob.findAndCountAll({
    where,
    include: ['document', 'payment'],
    limit: parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit),
    order: [['createdAt', 'DESC']]
  });

  res.json({
    printJobs: printJobs.rows,
    totalCount: printJobs.count,
    currentPage: parseInt(page),
    totalPages: Math.ceil(printJobs.count / parseInt(limit))
  });
}));

// GET /api/print-jobs/:id
router.get('/:id', asyncHandler(async (req, res) => {
  const printJob = await PrintJob.findOne({
    where: { 
      id: req.params.id, 
      userId: req.user.userId 
    },
    include: ['document', 'user', 'payment']
  });

  if (!printJob) {
    return res.status(404).json({ error: 'Print job not found' });
  }

  res.json({ printJob });
}));

// PUT /api/print-jobs/:id/cancel
router.put('/:id/cancel', asyncHandler(async (req, res) => {
  const printJob = await PrintJob.findOne({
    where: { 
      id: req.params.id, 
      userId: req.user.userId 
    }
  });

  if (!printJob) {
    return res.status(404).json({ error: 'Print job not found' });
  }

  if (!['pending', 'paid', 'queued'].includes(printJob.status)) {
    return res.status(400).json({ error: 'Print job cannot be cancelled' });
  }

  await printJob.updateStatus('cancelled');

  res.json({ 
    message: 'Print job cancelled successfully',
    printJob 
  });
}));

// GET /api/print-jobs/queue (Admin/Operator only)
router.get('/queue/all', requireRole(['admin', 'operator']), asyncHandler(async (req, res) => {
  const { status = 'queued' } = req.query;

  const printJobs = await PrintJob.findAll({
    where: { status },
    include: ['document', 'user', 'payment'],
    order: [['createdAt', 'ASC']]
  });

  res.json({ printJobs });
}));

// PUT /api/print-jobs/:id/status (Admin/Operator only)
router.put('/:id/status', requireRole(['admin', 'operator']), asyncHandler(async (req, res) => {
  const { status, printerName, failureReason } = req.body;

  const printJob = await PrintJob.findByPk(req.params.id);
  if (!printJob) {
    return res.status(404).json({ error: 'Print job not found' });
  }

  const updateData = { status };
  if (printerName) updateData.printerName = printerName;
  if (failureReason) updateData.failureReason = failureReason;

  await printJob.updateStatus(status, updateData);

  res.json({ 
    message: 'Print job status updated successfully',
    printJob 
  });
}));

module.exports = router;
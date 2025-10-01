const express = require('express');
const { Payment, User, PrintJob } = require('../models');
const { asyncHandler } = require('../middleware/asyncHandler');
const { requireRole } = require('../middleware/auth');
const { processStripePayment } = require('../services/paymentService');
const { generateUPID } = require('../services/upidService');
const { assignQueuePosition } = require('../services/queueService');
const { Op } = require('sequelize');

const router = express.Router();

// POST /api/payments/submit - Create payment record with 'pending' status
router.post('/submit', asyncHandler(async (req, res) => {
  const { printJobId, txId, amount } = req.body;

  if (!printJobId || !txId) {
    return res.status(400).json({ error: 'Print job ID and transaction ID are required' });
  }

  // Validate print job
  const printJob = await PrintJob.findOne({
    where: { 
      id: printJobId, 
      userId: req.user.userId,
      status: 'awaiting_payment'
    }
  });

  if (!printJob) {
    return res.status(404).json({ error: 'Print job not found or not awaiting payment' });
  }

  // Check if tx_id is unique
  const existingPayment = await Payment.findOne({ where: { txId } });
  if (existingPayment) {
    return res.status(400).json({ error: 'Transaction ID already used' });
  }

  // Validate amount matches job cost
  const submittedAmount = parseFloat(amount);
  const expectedAmount = parseFloat(printJob.totalCost);
  
  if (Math.abs(submittedAmount - expectedAmount) > 0.01) {
    return res.status(400).json({ 
      error: 'Payment amount does not match job cost',
      expected: expectedAmount,
      submitted: submittedAmount
    });
  }

  // Create payment record with pending status
  const payment = await Payment.create({
    userId: req.user.userId,
    amount: submittedAmount,
    currency: 'BDT',
    paymentMethod: 'bkash',
    txId: txId,
    status: 'pending',
    description: `Print job payment - ${printJob.jobNumber}`
  });

  // Link payment to print job
  await printJob.update({ paymentId: payment.id });

  res.status(201).json({
    message: 'Payment submitted successfully and is pending verification',
    payment: {
      id: payment.id,
      transactionId: payment.transactionId,
      txId: payment.txId,
      amount: payment.amount,
      status: payment.status,
      createdAt: payment.createdAt
    }
  });
}));

// POST /api/payments/:id/process
router.post('/:id/process', asyncHandler(async (req, res) => {
  const { paymentMethodId, useBalance = false } = req.body;

  const payment = await Payment.findOne({
    where: { 
      id: req.params.id, 
      userId: req.user.userId,
      status: 'pending'
    },
    include: ['user', 'printJob']
  });

  if (!payment) {
    return res.status(404).json({ error: 'Payment not found' });
  }

  try {
    if (useBalance) {
      // Pay with user balance
      const user = payment.user;
      if (user.balance < payment.amount) {
        return res.status(400).json({ error: 'Insufficient balance' });
      }

      // Deduct from balance
      await user.update({ 
        balance: parseFloat(user.balance) - parseFloat(payment.amount)
      });

      await payment.completePayment({ source: 'balance' });
      
      // Update print job status
      if (payment.printJob) {
        await payment.printJob.updateStatus('paid');
      }

    } else if (payment.paymentMethod === 'card') {
      // Process Stripe payment
      const result = await processStripePayment(payment, paymentMethodId);
      
      if (result.success) {
        await payment.completePayment({ 
          stripePaymentIntentId: result.paymentIntentId 
        });
        
        if (payment.printJob) {
          await payment.printJob.updateStatus('paid');
        }
      } else {
        await payment.failPayment(result.error);
        return res.status(400).json({ error: result.error });
      }
    }

    res.json({
      message: 'Payment processed successfully',
      payment: await Payment.findByPk(payment.id, {
        include: ['printJob']
      })
    });

  } catch (error) {
    await payment.failPayment(error.message);
    res.status(500).json({ error: 'Payment processing failed' });
  }
}));

// GET /api/payments/pending - Admin only endpoint to get pending payments
router.get('/pending', requireRole(['admin']), asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;

  const payments = await Payment.findAndCountAll({
    where: { status: 'pending' },
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName', 'email', 'studentId']
      },
      {
        model: PrintJob,
        as: 'printJob',
        include: ['document']
      }
    ],
    limit: parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit),
    order: [['createdAt', 'ASC']]
  });

  res.json({
    payments: payments.rows,
    totalCount: payments.count,
    currentPage: parseInt(page),
    totalPages: Math.ceil(payments.count / parseInt(limit))
  });
}));

// GET /api/payments (user's own payments)
router.get('/', asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status } = req.query;
  
  const where = { userId: req.user.userId };
  if (status) where.status = status;

  const payments = await Payment.findAndCountAll({
    where,
    include: ['printJob'],
    limit: parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit),
    order: [['createdAt', 'DESC']]
  });

  res.json({
    payments: payments.rows,
    totalCount: payments.count,
    currentPage: parseInt(page),
    totalPages: Math.ceil(payments.count / parseInt(limit))
  });
}));

// GET /api/payments/:id
router.get('/:id', asyncHandler(async (req, res) => {
  const payment = await Payment.findOne({
    where: { 
      id: req.params.id, 
      userId: req.user.userId 
    },
    include: ['user', 'printJob']
  });

  if (!payment) {
    return res.status(404).json({ error: 'Payment not found' });
  }

  res.json({ payment });
}));

// POST /api/payments/:id/refund
router.post('/:id/refund', asyncHandler(async (req, res) => {
  const { amount } = req.body;

  const payment = await Payment.findOne({
    where: { 
      id: req.params.id, 
      userId: req.user.userId 
    }
  });

  if (!payment) {
    return res.status(404).json({ error: 'Payment not found' });
  }

  if (!payment.canRefund()) {
    return res.status(400).json({ error: 'Payment cannot be refunded' });
  }

  try {
    await payment.refund(amount);
    
    // Add refund amount back to user balance
    const user = await User.findByPk(req.user.userId);
    const refundAmount = amount || (payment.amount - payment.refundAmount);
    await user.update({ 
      balance: parseFloat(user.balance) + parseFloat(refundAmount)
    });

    res.json({
      message: 'Refund processed successfully',
      payment
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}));

// POST /api/payments/verify - Admin only: verify payment and generate UPID
router.post('/verify', requireRole(['admin']), asyncHandler(async (req, res) => {
  const { paymentId, verified = true, adminNotes = '' } = req.body;

  if (!paymentId) {
    return res.status(400).json({ error: 'Payment ID is required' });
  }

  const payment = await Payment.findOne({
    where: { id: paymentId, status: 'pending' },
    include: [
      {
        model: PrintJob,
        as: 'printJob',
        include: ['user', 'document']
      }
    ]
  });

  if (!payment) {
    return res.status(404).json({ error: 'Payment not found or already processed' });
  }

  if (!payment.printJob) {
    return res.status(400).json({ error: 'No associated print job found' });
  }

  try {
    if (verified) {
      // Generate UPID
      const upid = await generateUPID();
      
      // Assign queue position atomically
      const queuePosition = await assignQueuePosition(payment.printJob.id);
      
      // Update payment status to verified
      await payment.update({
        status: 'verified',
        processedAt: new Date(),
        metadata: {
          ...payment.metadata,
          verifiedBy: req.user.userId,
          verifiedAt: new Date(),
          adminNotes: adminNotes
        }
      });
      
      // Update print job with UPID and queue position
      await payment.printJob.update({
        upid: upid,
        queuePosition: queuePosition,
        status: 'queued'
      });
      
      // Emit real-time update
      const io = req.app.get('io');
      io.emit('paymentVerified', {
        userId: payment.userId,
        printJobId: payment.printJob.id,
        upid: upid,
        queuePosition: queuePosition
      });
      
      res.json({
        message: 'Payment verified successfully',
        upid: upid,
        queuePosition: queuePosition,
        payment: {
          id: payment.id,
          status: payment.status,
          verifiedAt: payment.processedAt
        }
      });
      
    } else {
      // Mark payment as failed
      await payment.update({
        status: 'failed',
        processedAt: new Date(),
        failureReason: adminNotes || 'Payment verification failed',
        metadata: {
          ...payment.metadata,
          rejectedBy: req.user.userId,
          rejectedAt: new Date(),
          adminNotes: adminNotes
        }
      });
      
      // Update print job status
      await payment.printJob.update({
        status: 'cancelled',
        failureReason: 'Payment verification failed'
      });
      
      res.json({
        message: 'Payment verification failed',
        payment: {
          id: payment.id,
          status: payment.status,
          failureReason: payment.failureReason
        }
      });
    }
    
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ error: 'Failed to process payment verification' });
  }
}));

module.exports = router;
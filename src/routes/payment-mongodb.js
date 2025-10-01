const express = require('express');
const { Payment, User, PrintJob } = require('../models/mongodb');
const { asyncHandler } = require('../middleware/asyncHandler');
const { authenticate } = require('../middleware/auth');
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

// Generate UPID (Unique Print ID)
function generateUPID() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// POST /api/payment/submit - Submit payment with Transaction ID
router.post('/submit', extractUser, asyncHandler(async (req, res) => {
  const { txId, amount, documentId } = req.body;
  const userId = req.user.userId;

  console.log('💰 Payment submission:', { userId, txId, amount, documentId });

  if (!txId || !amount || !documentId) {
    return res.status(400).json({ 
      success: false,
      error: 'Transaction ID, amount, and document ID are required' 
    });
  }

  // Check if tx_id is unique
  const existingPayment = await Payment.findOne({ txId: txId.toUpperCase() });
  if (existingPayment) {
    console.log('❌ Transaction ID already used:', txId);
    return res.status(400).json({ 
      success: false,
      error: 'Transaction ID already used' 
    });
  }

  // Generate unique UPID
  let upid;
  let attempts = 0;
  do {
    upid = generateUPID();
    attempts++;
  } while (await Payment.findOne({ upid }) && attempts < 5);

  if (attempts >= 5) {
    return res.status(500).json({ 
      success: false,
      error: 'Failed to generate unique UPID' 
    });
  }

  // Create payment record
  const payment = new Payment({
    userId,
    amount: parseFloat(amount),
    currency: 'BDT',
    status: 'pending',
    paymentMethod: 'bkash',
    txId: txId.toUpperCase(),
    upid,
    documentId,
    description: `Print job for ${documentId}`,
    gatewayData: {
      submitTime: new Date(),
      clientIP: req.ip
    }
  });

  await payment.save();

  console.log('✅ Payment submitted successfully:', { upid, txId });

  res.status(201).json({
    success: true,
    message: 'Payment submitted for verification',
    data: {
      paymentId: payment._id.toString(),
      upid,
      status: 'pending',
      amount: payment.amount,
      txId: payment.txId,
      submitTime: payment.createdAt
    }
  });
}));

// GET /api/payment/status/:upid - Get payment status by UPID
router.get('/status/:upid', extractUser, asyncHandler(async (req, res) => {
  const { upid } = req.params;
  const userId = req.user.userId;

  const payment = await Payment.findOne({ 
    upid: upid.toUpperCase(),
    userId 
  });

  if (!payment) {
    return res.status(404).json({ 
      success: false,
      error: 'Payment not found' 
    });
  }

  res.json({
    success: true,
    data: {
      upid: payment.upid,
      status: payment.status,
      amount: payment.amount,
      txId: payment.txId,
      submitTime: payment.createdAt,
      verifiedAt: payment.verifiedAt,
      description: payment.description
    }
  });
}));

// GET /api/payment/history - Get user's payment history
router.get('/history', extractUser, asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const payments = await Payment.find({ userId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await Payment.countDocuments({ userId });

  res.json({
    success: true,
    data: {
      payments: payments.map(payment => ({
        id: payment._id,
        upid: payment.upid,
        status: payment.status,
        amount: payment.amount,
        txId: payment.txId,
        documentId: payment.documentId,
        description: payment.description,
        submitTime: payment.createdAt,
        verifiedAt: payment.verifiedAt
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
}));

// Admin routes (for verifying payments)
router.post('/verify/:paymentId', extractUser, asyncHandler(async (req, res) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      success: false,
      error: 'Admin access required' 
    });
  }

  const { paymentId } = req.params;
  const { verified } = req.body;

  const payment = await Payment.findById(paymentId);
  if (!payment) {
    return res.status(404).json({ 
      success: false,
      error: 'Payment not found' 
    });
  }

  payment.status = verified ? 'verified' : 'failed';
  payment.verifiedAt = new Date();
  payment.verifiedBy = req.user.userId;

  await payment.save();

  console.log(`${verified ? '✅' : '❌'} Payment ${verified ? 'verified' : 'rejected'}:`, payment.upid);

  res.json({
    success: true,
    message: `Payment ${verified ? 'verified' : 'rejected'} successfully`,
    data: {
      upid: payment.upid,
      status: payment.status,
      verifiedAt: payment.verifiedAt
    }
  });
}));

module.exports = router;
const express = require('express');
const { User } = require('../models/mongodb');
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

// GET /api/students/:upid - Get student by UPID (for kiosk)
router.get('/:upid', checkApiKey, asyncHandler(async (req, res) => {
  const { upid } = req.params;
  
  console.log(`🔍 Kiosk lookup request for UPID: ${upid}`);
  
  if (!upid) {
    return res.status(400).json({
      success: false,
      error: 'UPID is required'
    });
  }

  // Find user by UPID
  const user = await User.findOne({ upid: upid.toUpperCase() });
  
  if (!user) {
    console.log(`❌ User not found for UPID: ${upid}`);
    return res.status(404).json({
      success: false,
      error: 'Student not found',
      upid
    });
  }

  console.log(`✅ User found: ${user.firstName} ${user.lastName} (${user.email})`);
  
  res.json({
    success: true,
    user: {
      id: user._id,
      upid: user.upid,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      balance: user.balance || 0
    }
  });
}));

module.exports = router;
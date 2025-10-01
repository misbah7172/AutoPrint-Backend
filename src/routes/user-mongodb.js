const express = require('express');
const { User } = require('../models/mongodb');
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

// GET /api/user/profile - Get user profile
router.get('/profile', extractUser, asyncHandler(async (req, res) => {
  const userId = req.user.userId;

  const user = await User.findById(userId).lean();
  
  if (!user) {
    return res.status(404).json({ 
      success: false,
      error: 'User not found' 
    });
  }

  // Remove sensitive data
  const userProfile = {
    id: user._id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    studentId: user.studentId,
    role: user.role,
    balance: user.balance,
    isActive: user.isActive,
    createdAt: user.createdAt,
    lastLogin: user.lastLogin,
    upid: user.upid
  };

  res.json({
    success: true,
    data: userProfile
  });
}));

// PUT /api/user/profile - Update user profile
router.put('/profile', extractUser, asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const { firstName, lastName, studentId } = req.body;

  const user = await User.findById(userId);
  
  if (!user) {
    return res.status(404).json({ 
      success: false,
      error: 'User not found' 
    });
  }

  // Update allowed fields
  if (firstName) user.firstName = firstName.trim();
  if (lastName) user.lastName = lastName.trim();
  
  // Check if studentId is being changed and if it's unique
  if (studentId && studentId !== user.studentId) {
    const existingUser = await User.findOne({ 
      studentId: studentId.trim(),
      _id: { $ne: userId }
    });
    
    if (existingUser) {
      return res.status(400).json({ 
        success: false,
        error: 'Student ID already exists' 
      });
    }
    
    user.studentId = studentId.trim();
  }

  await user.save();

  console.log('✅ User profile updated:', userId);

  // Remove sensitive data
  const userProfile = {
    id: user._id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    studentId: user.studentId,
    role: user.role,
    balance: user.balance,
    isActive: user.isActive,
    createdAt: user.createdAt,
    lastLogin: user.lastLogin,
    upid: user.upid
  };

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: userProfile
  });
}));

module.exports = router;
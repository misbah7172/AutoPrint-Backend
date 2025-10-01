const express = require('express');
const { body } = require('express-validator');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { validateRequest } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/asyncHandler');

const router = express.Router();

// POST /api/auth/register
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('firstName').trim().isLength({ min: 1 }),
  body('lastName').trim().isLength({ min: 1 }),
  body('studentId').optional().trim().isLength({ min: 3 })
], validateRequest, asyncHandler(async (req, res) => {
  const { email, password, firstName, lastName, studentId } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) {
    return res.status(400).json({ error: 'User already exists' });
  }

  // Create new user
  const user = await User.create({
    email,
    password,
    firstName,
    lastName,
    studentId
  });

  // Generate JWT token
  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.status(201).json({
    message: 'User registered successfully',
    token,
    user
  });
}));

// POST /api/auth/login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], validateRequest, asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find user
  const user = await User.findOne({ where: { email, isActive: true } });
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Check password
  const isValidPassword = await user.comparePassword(password);
  if (!isValidPassword) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Update last login
  await user.update({ lastLoginAt: new Date() });

  // Generate JWT token
  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    message: 'Login successful',
    token,
    user
  });
}));

// POST /api/auth/refresh
router.post('/refresh', asyncHandler(async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.userId);

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const newToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token: newToken, user });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}));

// POST /api/auth/google-signin - Google sign-in endpoint for mobile apps
router.post('/google-signin', [
  body('firebaseUid').notEmpty().withMessage('Firebase UID is required'),
  body('email').isEmail().normalizeEmail(),
  body('name').notEmpty().withMessage('Name is required'),
  body('photoUrl').optional(),
  body('authProvider').optional()
], validateRequest, asyncHandler(async (req, res) => {
  const { firebaseUid, email, name, photoUrl, authProvider } = req.body;

  try {
    // Check if user already exists
    let user = await User.findOne({ where: { email } });
    let isNewUser = false;

    if (!user) {
      // Create new user from Google sign-in
      const nameParts = name.split(' ');
      const firstName = nameParts[0] || 'Unknown';
      const lastName = nameParts.slice(1).join(' ') || 'User';

      user = await User.create({
        email,
        firstName,
        lastName,
        password: firebaseUid, // Use Firebase UID as password (will be hashed)
        photoUrl: photoUrl || null,
        authProvider: authProvider || 'google',
        firebaseUid,
        role: 'student',
        isActive: true,
        balance: 0
      });
      isNewUser = true;
    } else {
      // Update existing user's photo URL and Firebase UID if needed
      await user.update({
        photoUrl: photoUrl || user.photoUrl,
        firebaseUid: firebaseUid,
        authProvider: authProvider || user.authProvider || 'google',
        lastLoginAt: new Date()
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(isNewUser ? 201 : 200).json({
      message: isNewUser ? 'User created successfully' : 'User authenticated successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        name: `${user.firstName} ${user.lastName}`,
        photoUrl: user.photoUrl,
        authProvider: user.authProvider,
        role: user.role,
        balance: user.balance
      },
      isNewUser
    });
  } catch (error) {
    console.error('Google sign-in error:', error);
    res.status(500).json({ 
      error: 'Failed to authenticate user',
      message: error.message 
    });
  }
}));

// GET /api/auth/profile - Get user profile
router.get('/profile', asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization token required' });
  }

  const token = authHeader.substring(7);
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.userId);

    if (!user || !user.isActive) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        name: `${user.firstName} ${user.lastName}`,
        photoUrl: user.photoUrl,
        authProvider: user.authProvider,
        role: user.role,
        balance: user.balance,
        studentId: user.studentId
      }
    });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}));

module.exports = router;
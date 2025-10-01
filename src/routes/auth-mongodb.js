const express = require('express');
const { body } = require('express-validator');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { User } = require('../models/mongodb');
const { validateRequest } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/asyncHandler');

const router = express.Router();

// POST /api/auth/google-signin - Handle Google Sign-In with university email validation
router.post('/google-signin', [
  body('firebaseUid').trim().isLength({ min: 1 }),
  body('email').isEmail().normalizeEmail(),
  body('name').trim().isLength({ min: 1 }),
  body('authProvider').equals('google')
], validateRequest, asyncHandler(async (req, res) => {
  const { firebaseUid, email, name, photoUrl, authProvider } = req.body;

  console.log('🔐 Google Sign-In attempt for:', email);

  // Validate university email
  if (!email.toLowerCase().endsWith('ac.bd')) {
    console.log('❌ Invalid email domain:', email);
    return res.status(400).json({
      success: false,
      message: 'Only university emails ending with "ac.bd" are allowed.'
    });
  }

  try {
    // Check if user exists
    let user = await User.findOne({ 
      $or: [
        { email },
        { firebaseUid }
      ]
    });

    let isNewUser = false;

    if (!user) {
      // Create new user
      console.log('👤 Creating new user:', email);
      user = new User({
        firebaseUid,
        email,
        name,
        photoUrl,
        authProvider,
        isEmailVerified: true, // Google emails are pre-verified
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await user.save();
      isNewUser = true;
      console.log('✅ New user created successfully');
    } else {
      // Update existing user
      console.log('🔄 Updating existing user:', email);
      user.firebaseUid = firebaseUid;
      user.name = name;
      user.photoUrl = photoUrl;
      user.authProvider = authProvider;
      user.isEmailVerified = true;
      user.updatedAt = new Date();
      
      await user.save();
      console.log('✅ User updated successfully');
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id,
        firebaseUid: user.firebaseUid,
        email: user.email,
        authProvider: user.authProvider
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return user data (without sensitive fields)
    const userData = {
      id: user._id,
      firebaseUid: user.firebaseUid,
      email: user.email,
      name: user.name,
      photoUrl: user.photoUrl,
      authProvider: user.authProvider,
      isEmailVerified: user.isEmailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    console.log('✅ Google Sign-In successful for:', email);
    
    res.status(isNewUser ? 201 : 200).json({
      success: true,
      user: userData,
      token,
      isNewUser,
      message: isNewUser ? 'Account created successfully' : 'Sign-in successful'
    });
  } catch (error) {
    console.error('❌ Google Sign-In error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during Google Sign-In'
    });
  }
}));

// POST /api/auth/register
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('firstName').trim().isLength({ min: 1 }),
  body('lastName').trim().isLength({ min: 1 }),
  body('studentId').optional().trim().isLength({ min: 3 })
], validateRequest, asyncHandler(async (req, res) => {
  const { email, password, firstName, lastName, studentId } = req.body;

  console.log('📝 Registration attempt for:', email);

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    console.log('❌ User already exists:', email);
    return res.status(400).json({ 
      success: false,
      error: 'User already exists with this email' 
    });
  }

  // Check if studentId already exists
  if (studentId) {
    const existingStudentId = await User.findOne({ studentId });
    if (existingStudentId) {
      console.log('❌ Student ID already exists:', studentId);
      return res.status(400).json({ 
        success: false,
        error: 'Student ID already exists' 
      });
    }
  }

  // Hash password
  const saltRounds = 12;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  // Create new user
  const user = new User({
    email,
    password: hashedPassword,
    firstName,
    lastName,
    studentId,
    role: 'student'
  });

  await user.save();
  console.log('✅ User registered successfully:', email);

  // Generate JWT token
  const token = jwt.sign(
    { 
      userId: user._id.toString(), 
      email: user.email, 
      role: user.role 
    },
    process.env.JWT_SECRET || 'your-jwt-secret',
    { expiresIn: '7d' }
  );

  // Remove password from response
  const userResponse = user.toObject();
  delete userResponse.password;

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    token,
    user: userResponse
  });
}));

// POST /api/auth/login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 1 })
], validateRequest, asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  console.log('🔐 Login attempt for:', email);

  // Find user by email
  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    console.log('❌ User not found:', email);
    return res.status(401).json({ 
      success: false,
      error: 'Invalid email or password' 
    });
  }

  // Check if user is active
  if (!user.isActive) {
    console.log('❌ User account is disabled:', email);
    return res.status(401).json({ 
      success: false,
      error: 'Account is disabled. Please contact support.' 
    });
  }

  // Verify password
  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    console.log('❌ Invalid password for:', email);
    return res.status(401).json({ 
      success: false,
      error: 'Invalid email or password' 
    });
  }

  console.log('✅ User logged in successfully:', email);

  // Update last login
  user.lastLogin = new Date();
  await user.save();

  // Generate JWT token
  const token = jwt.sign(
    { 
      userId: user._id.toString(), 
      email: user.email, 
      role: user.role 
    },
    process.env.JWT_SECRET || 'your-jwt-secret',
    { expiresIn: '7d' }
  );

  // Remove password from response
  const userResponse = user.toObject();
  delete userResponse.password;

  res.json({
    success: true,
    message: 'Login successful',
    token,
    user: userResponse
  });
}));

// POST /api/auth/verify-token
router.post('/verify-token', asyncHandler(async (req, res) => {
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

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({
      success: true,
      user: userResponse
    });
  } catch (error) {
    console.log('❌ Token verification failed:', error.message);
    res.status(401).json({ 
      success: false,
      error: 'Invalid token' 
    });
  }
}));

// POST /api/auth/refresh-token
router.post('/refresh-token', asyncHandler(async (req, res) => {
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

    // Generate new token
    const newToken = jwt.sign(
      { 
        userId: user._id.toString(), 
        email: user.email, 
        role: user.role 
      },
      process.env.JWT_SECRET || 'your-jwt-secret',
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token: newToken
    });
  } catch (error) {
    console.log('❌ Token refresh failed:', error.message);
    res.status(401).json({ 
      success: false,
      error: 'Invalid token' 
    });
  }
}));

// POST /api/auth/firebase-sync - Sync Firebase user with MongoDB
router.post('/firebase-sync', asyncHandler(async (req, res) => {
  const { firebaseUid, email, firstName, lastName, studentId, isGoogleSignIn } = req.body;

  console.log('🔥 Firebase sync request:', { firebaseUid, email, firstName, lastName });

  if (!firebaseUid || !email || !firstName || !lastName) {
    return res.status(400).json({ 
      success: false,
      error: 'Firebase UID, email, first name, and last name are required' 
    });
  }

  try {
    // Check if user already exists by Firebase UID
    let user = await User.findOne({ firebaseUid });
    
    if (user) {
      // Update existing user
      user.email = email.toLowerCase();
      user.firstName = firstName.trim();
      user.lastName = lastName.trim();
      if (studentId) user.studentId = studentId.trim();
      user.lastLogin = new Date();
      await user.save();
      
      console.log('✅ Existing Firebase user updated:', email);
    } else {
      // Check if user exists by email (for migration)
      user = await User.findOne({ email: email.toLowerCase() });
      
      if (user) {
        // Link existing email user to Firebase
        user.firebaseUid = firebaseUid;
        user.lastLogin = new Date();
        await user.save();
        
        console.log('✅ Existing email user linked to Firebase:', email);
      } else {
        // Create new user
        user = new User({
          firebaseUid,
          email: email.toLowerCase(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          studentId: studentId?.trim(),
          role: 'student',
          isActive: true,
          authProvider: isGoogleSignIn ? 'google' : 'email',
        });

        await user.save();
        console.log('✅ New Firebase user created:', email);
      }
    }

    // Generate JWT token for MongoDB API access
    const token = jwt.sign(
      { 
        userId: user._id.toString(), 
        email: user.email, 
        role: user.role,
        firebaseUid: user.firebaseUid
      },
      process.env.JWT_SECRET || 'your-jwt-secret',
      { expiresIn: '7d' }
    );

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(user.isNew ? 201 : 200).json({
      success: true,
      message: user.isNew ? 'User created and synced successfully' : 'User synced successfully',
      token,
      user: userResponse
    });
  } catch (error) {
    console.error('❌ Firebase sync error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Firebase sync failed: ' + error.message 
    });
  }
}));

// POST /api/auth/firebase-auth - Authenticate existing Firebase user with MongoDB
router.post('/firebase-auth', asyncHandler(async (req, res) => {
  const { firebaseUid, email } = req.body;

  console.log('🔥 Firebase authentication:', { firebaseUid, email });

  if (!firebaseUid || !email) {
    return res.status(400).json({ 
      success: false,
      error: 'Firebase UID and email are required' 
    });
  }

  try {
    // Find user by Firebase UID or email
    let user = await User.findOne({ 
      $or: [
        { firebaseUid },
        { email: email.toLowerCase() }
      ]
    });

    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found. Please register first.' 
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ 
        success: false,
        error: 'Account is disabled. Please contact support.' 
      });
    }

    // Update Firebase UID if not set (for migration)
    if (!user.firebaseUid) {
      user.firebaseUid = firebaseUid;
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    console.log('✅ Firebase user authenticated:', email);

    // Generate JWT token for MongoDB API access
    const token = jwt.sign(
      { 
        userId: user._id.toString(), 
        email: user.email, 
        role: user.role,
        firebaseUid: user.firebaseUid
      },
      process.env.JWT_SECRET || 'your-jwt-secret',
      { expiresIn: '7d' }
    );

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({
      success: true,
      message: 'Authentication successful',
      token,
      user: userResponse
    });
  } catch (error) {
    console.error('❌ Firebase auth error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Authentication failed: ' + error.message 
    });
  }
}));

module.exports = router;
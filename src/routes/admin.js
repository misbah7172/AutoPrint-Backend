const express = require('express');
const { body } = require('express-validator');
const jwt = require('jsonwebtoken');
const { User, Document, PrintJob, Payment } = require('../models');
const { asyncHandler } = require('../middleware/asyncHandler');
const { validateRequest } = require('../middleware/validation');
const { requireRole } = require('../middleware/auth');
const workersRoutes = require('./admin/workers');

const router = express.Router();

// POST /api/admin/login - Admin login endpoint
router.post('/login', [
  body('username').notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required')
], validateRequest, asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  // For admin login, we'll check for a user with email = username and role = admin
  // or if it's the default admin credentials
  let user;
  
  // Check for default admin credentials
  if (username === 'admin' && password === 'admin123') {
    // Find or create admin user
    user = await User.findOne({ where: { email: 'admin@autoprint.com' } });
    if (!user) {
      // Create default admin user
      user = await User.create({
        email: 'admin@autoprint.com',
        password: 'admin123',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        isActive: true,
        authProvider: 'local'
      });
    } else {
      // If admin user exists but password might be different (e.g., from Google sign-in)
      // Update the password to ensure it's 'admin123'
      const isValidPassword = await user.comparePassword('admin123');
      if (!isValidPassword) {
        await user.update({ password: 'admin123', authProvider: 'local' });
      }
    }
  } else {
    // Find user by email (treating username as email) with admin role
    user = await User.findOne({ 
      where: { 
        email: username, 
        role: 'admin',
        isActive: true 
      } 
    });
  }

  if (!user) {
    return res.status(401).json({ error: 'Invalid admin credentials' });
  }

  // Check password
  const isValidPassword = await user.comparePassword(password);
  if (!isValidPassword) {
    return res.status(401).json({ error: 'Invalid admin credentials' });
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
    message: 'Admin login successful',
    token,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role
    }
  });
}));

// All other admin routes require admin role
router.use(requireRole(['admin']));

// GET /api/admin/dashboard
router.get('/dashboard', asyncHandler(async (req, res) => {
  const stats = await Promise.all([
    User.count(),
    Document.count(),
    PrintJob.count(),
    Payment.sum('amount'),
    PrintJob.count({ where: { status: 'queued' } }),
    PrintJob.count({ where: { status: 'printing' } })
  ]);

  res.json({
    totalUsers: stats[0],
    totalDocuments: stats[1],
    totalPrintJobs: stats[2],
    totalRevenue: stats[3] || 0,
    queuedJobs: stats[4],
    printingJobs: stats[5]
  });
}));

// GET /api/admin/users
router.get('/users', asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search, role, isActive } = req.query;
  
  const where = {};
  if (search) {
    where[Op.or] = [
      { firstName: { [Op.iLike]: `%${search}%` } },
      { lastName: { [Op.iLike]: `%${search}%` } },
      { email: { [Op.iLike]: `%${search}%` } },
      { studentId: { [Op.iLike]: `%${search}%` } }
    ];
  }
  if (role) where.role = role;
  if (isActive !== undefined) where.isActive = isActive === 'true';

  const users = await User.findAndCountAll({
    where,
    limit: parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit),
    order: [['createdAt', 'DESC']],
    include: [
      { model: PrintJob, as: 'printJobs', attributes: ['id', 'status'] },
      { model: Payment, as: 'payments', attributes: ['id', 'amount', 'status'] }
    ]
  });

  res.json({
    users: users.rows,
    totalCount: users.count,
    currentPage: parseInt(page),
    totalPages: Math.ceil(users.count / parseInt(limit))
  });
}));

// PUT /api/admin/users/:id
router.put('/users/:id', asyncHandler(async (req, res) => {
  const { role, isActive, balance } = req.body;

  const user = await User.findByPk(req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const updateData = {};
  if (role) updateData.role = role;
  if (isActive !== undefined) updateData.isActive = isActive;
  if (balance !== undefined) updateData.balance = balance;

  await user.update(updateData);

  res.json({
    message: 'User updated successfully',
    user
  });
}));

// GET /api/admin/print-jobs
router.get('/print-jobs', asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, userId } = req.query;
  
  const where = {};
  if (status) where.status = status;
  if (userId) where.userId = userId;

  const printJobs = await PrintJob.findAndCountAll({
    where,
    include: ['user', 'document', 'payment'],
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

// GET /api/admin/payments
router.get('/payments', asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, userId } = req.query;
  
  const where = {};
  if (status) where.status = status;
  if (userId) where.userId = userId;

  const payments = await Payment.findAndCountAll({
    where,
    include: ['user', 'printJob'],
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

// GET /api/admin/reports/revenue
router.get('/reports/revenue', asyncHandler(async (req, res) => {
  const { startDate, endDate, groupBy = 'day' } = req.query;

  // Implementation for revenue reports
  // This would involve complex SQL queries with date grouping
  
  res.json({
    message: 'Revenue report endpoint - implement based on requirements',
    parameters: { startDate, endDate, groupBy }
  });
}));

// GET /api/admin/reports/usage
router.get('/reports/usage', asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  // Implementation for usage reports
  
  res.json({
    message: 'Usage report endpoint - implement based on requirements',
    parameters: { startDate, endDate }
  });
}));

// Mount worker management routes
router.use('/workers', workersRoutes);

module.exports = router;
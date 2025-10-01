const express = require('express');
const { body } = require('express-validator');
const crypto = require('crypto');
const { User, Document, PrintJob, Payment, sequelize } = require('../models');
const { asyncHandler } = require('../middleware/asyncHandler');
const { validateRequest } = require('../middleware/validation');
const workersRoutes = require('./admin/workers');

const router = express.Router();

// Simple in-memory session storage for admin (production should use Redis/database)
const adminSessions = new Map();

// Clean expired sessions periodically
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, session] of adminSessions.entries()) {
    if (session.expiresAt < now) {
      adminSessions.delete(sessionId);
    }
  }
}, 5 * 60 * 1000); // Clean every 5 minutes

// Simple admin authentication middleware
const authenticateAdmin = (req, res, next) => {
  const sessionId = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!sessionId) {
    return res.status(401).json({ error: 'Access denied. No session token provided.' });
  }

  const session = adminSessions.get(sessionId);
  if (!session || session.expiresAt < Date.now()) {
    if (session) adminSessions.delete(sessionId);
    return res.status(401).json({ error: 'Invalid or expired session.' });
  }

  // Extend session
  session.expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  session.lastAccess = Date.now();

  req.admin = session.admin;
  next();
};

// POST /api/admin/login - Simple admin login
router.post('/login', [
  body('username').notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required')
], validateRequest, asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  // Simple hardcoded admin check (you can modify these credentials)
  if (username !== 'admin' || password !== 'admin123') {
    return res.status(401).json({ error: 'Invalid admin credentials' });
  }

  // Create session
  const sessionId = crypto.randomBytes(32).toString('hex');
  const session = {
    admin: {
      id: 'admin-001',
      username: 'admin',
      email: 'admin@autoprint.com',
      role: 'admin'
    },
    expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    createdAt: Date.now(),
    lastAccess: Date.now()
  };

  adminSessions.set(sessionId, session);

  res.json({
    message: 'Admin login successful',
    token: sessionId,
    admin: session.admin
  });
}));

// POST /api/admin/logout
router.post('/logout', (req, res) => {
  const sessionId = req.header('Authorization')?.replace('Bearer ', '');
  if (sessionId) {
    adminSessions.delete(sessionId);
  }
  res.json({ message: 'Logged out successfully' });
});

// All other admin routes require authentication
router.use(authenticateAdmin);

// GET /api/admin/dashboard
router.get('/dashboard', asyncHandler(async (req, res) => {
  try {
    const [
      totalUsers,
      totalDocuments, 
      totalPrintJobs,
      totalRevenue,
      queuedJobs,
      printingJobs,
      completedJobs,
      failedJobs,
      pendingPayments,
      verifiedPayments,
      activeUsers,
      todayRevenue
    ] = await Promise.all([
      User.count({ where: { role: 'student' } }),
      Document.count(),
      PrintJob.count(),
      Payment.sum('amount', { where: { status: 'completed' } }),
      PrintJob.count({ where: { status: 'queued' } }),
      PrintJob.count({ where: { status: 'printing' } }),
      PrintJob.count({ where: { status: 'completed' } }),
      PrintJob.count({ where: { status: 'failed' } }),
      Payment.count({ where: { status: 'pending' } }),
      Payment.count({ where: { status: 'verified' } }),
      User.count({ 
        where: { 
          role: 'student',
          isActive: true,
          lastLoginAt: {
            [sequelize.Sequelize.Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        }
      }),
      Payment.sum('amount', { 
        where: { 
          status: 'completed',
          createdAt: {
            [sequelize.Sequelize.Op.gte]: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      })
    ]);

    // Get recent activity
    const recentJobs = await PrintJob.findAll({
      limit: 5,
      order: [['createdAt', 'DESC']],
      include: [
        { model: User, as: 'user', attributes: ['firstName', 'lastName', 'email'] },
        { model: Document, as: 'document', attributes: ['originalName'] }
      ]
    });

    const recentPayments = await Payment.findAll({
      limit: 5,
      order: [['createdAt', 'DESC']],
      include: [
        { model: User, as: 'user', attributes: ['firstName', 'lastName', 'email'] }
      ]
    });

    res.json({
      summary: {
        totalUsers,
        totalDocuments,
        totalPrintJobs,
        totalRevenue: totalRevenue || 0,
        todayRevenue: todayRevenue || 0,
        activeUsers
      },
      jobStats: {
        queued: queuedJobs,
        printing: printingJobs,
        completed: completedJobs,
        failed: failedJobs
      },
      paymentStats: {
        pending: pendingPayments,
        verified: verifiedPayments
      },
      recentActivity: {
        jobs: recentJobs,
        payments: recentPayments
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to load dashboard data' });
  }
}));

// GET /api/admin/users
router.get('/users', asyncHandler(async (req, res) => {
  try {
    const { page = 1, limit = 10, search, role, isActive } = req.query;
    
    const where = {};
    if (search) {
      where[sequelize.Sequelize.Op.or] = [
        { firstName: { [sequelize.Sequelize.Op.iLike]: `%${search}%` } },
        { lastName: { [sequelize.Sequelize.Op.iLike]: `%${search}%` } },
        { email: { [sequelize.Sequelize.Op.iLike]: `%${search}%` } },
        { studentId: { [sequelize.Sequelize.Op.iLike]: `%${search}%` } }
      ];
    }
    if (role) where.role = role;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const users = await User.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      order: [['createdAt', 'DESC']],
      attributes: { exclude: ['password'] }, // Don't send passwords
      include: [
        { 
          model: PrintJob, 
          as: 'printJobs', 
          attributes: ['id', 'status', 'createdAt'],
          limit: 5,
          order: [['createdAt', 'DESC']]
        },
        { 
          model: Payment, 
          as: 'payments', 
          attributes: ['id', 'amount', 'status', 'createdAt'],
          limit: 5,
          order: [['createdAt', 'DESC']]
        }
      ]
    });

    // Add computed fields
    const usersWithStats = await Promise.all(users.rows.map(async (user) => {
      const userStats = await Promise.all([
        PrintJob.count({ where: { userId: user.id } }),
        Payment.sum('amount', { where: { userId: user.id, status: 'completed' } }),
        PrintJob.count({ where: { userId: user.id, status: 'completed' } })
      ]);

      return {
        ...user.toJSON(),
        stats: {
          totalPrintJobs: userStats[0] || 0,
          totalSpent: userStats[1] || 0,
          completedJobs: userStats[2] || 0
        }
      };
    }));

    res.json({
      users: usersWithStats,
      totalCount: users.count,
      currentPage: parseInt(page),
      totalPages: Math.ceil(users.count / parseInt(limit))
    });
  } catch (error) {
    console.error('Users endpoint error:', error);
    res.status(500).json({ error: 'Failed to load users' });
  }
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
  try {
    const { page = 1, limit = 10, status, userId, method } = req.query;
    
    const where = {};
    if (status) where.status = status;
    if (userId) where.userId = userId;
    if (method) where.paymentMethod = method;

    const payments = await Payment.findAndCountAll({
      where,
      include: [
        { 
          model: User, 
          as: 'user', 
          attributes: ['id', 'firstName', 'lastName', 'email', 'studentId'] 
        }
      ],
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
  } catch (error) {
    console.error('Payments endpoint error:', error);
    res.status(500).json({ error: 'Failed to load payments' });
  }
}));

// PUT /api/admin/payments/:id/verify
router.put('/payments/:id/verify', asyncHandler(async (req, res) => {
  try {
    const { notes } = req.body;
    const payment = await Payment.findByPk(req.params.id, {
      include: [{ model: User, as: 'user' }]
    });
    
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    await payment.update({
      status: 'verified',
      verificationDetails: {
        verifiedBy: req.admin.email, // Fixed: use req.admin instead of req.user
        verifiedAt: new Date(),
        notes: notes || 'Payment verified by admin'
      }
    });

    // Update user balance
    if (payment.user) {
      await payment.user.update({
        balance: parseFloat(payment.user.balance || 0) + parseFloat(payment.amount)
      });
    }

    res.json({
      message: 'Payment verified successfully',
      payment: await Payment.findByPk(payment.id, {
        include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] }]
      })
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
}));

// GET /api/admin/queue
router.get('/queue', asyncHandler(async (req, res) => {
  try {
    const { status = 'queued' } = req.query;
    
    const queuedJobs = await PrintJob.findAll({
      where: { 
        status: ['queued', 'printing', 'waiting_for_confirm']
      },
      include: [
        { 
          model: User, 
          as: 'user', 
          attributes: ['id', 'firstName', 'lastName', 'email', 'studentId'] 
        },
        { 
          model: Document, 
          as: 'document', 
          attributes: ['id', 'originalName', 'pageCount', 'fileSize'] 
        },
        { 
          model: Payment, 
          as: 'payment', 
          attributes: ['id', 'amount', 'status'] 
        }
      ],
      order: [
        ['queuePosition', 'ASC'],
        ['createdAt', 'ASC']
      ]
    });

    // Separate by status
    const queue = {
      queued: queuedJobs.filter(job => job.status === 'queued'),
      printing: queuedJobs.filter(job => job.status === 'printing'),
      waitingConfirm: queuedJobs.filter(job => job.status === 'waiting_for_confirm')
    };

    res.json({
      queue,
      summary: {
        totalInQueue: queue.queued.length,
        currentlyPrinting: queue.printing.length,
        waitingConfirmation: queue.waitingConfirm.length,
        estimatedWaitTime: queue.queued.length * 5 // 5 minutes per job estimate
      }
    });
  } catch (error) {
    console.error('Queue endpoint error:', error);
    res.status(500).json({ error: 'Failed to load queue' });
  }
}));

// PUT /api/admin/queue/:id/start
router.put('/queue/:id/start', asyncHandler(async (req, res) => {
  try {
    const printJob = await PrintJob.findByPk(req.params.id);
    
    if (!printJob) {
      return res.status(404).json({ error: 'Print job not found' });
    }

    await printJob.update({
      status: 'printing',
      startedAt: new Date(),
      estimatedCompletionTime: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes from now
    });

    res.json({
      message: 'Print job started',
      printJob: await PrintJob.findByPk(printJob.id, {
        include: ['user', 'document', 'payment']
      })
    });
  } catch (error) {
    console.error('Start print job error:', error);
    res.status(500).json({ error: 'Failed to start print job' });
  }
}));

// PUT /api/admin/queue/:id/complete
router.put('/queue/:id/complete', asyncHandler(async (req, res) => {
  try {
    const { notes } = req.body;
    const printJob = await PrintJob.findByPk(req.params.id);
    
    if (!printJob) {
      return res.status(404).json({ error: 'Print job not found' });
    }

    await printJob.update({
      status: 'completed',
      actualCompletionTime: new Date(),
      operatorNotes: notes || 'Job completed successfully'
    });

    res.json({
      message: 'Print job completed',
      printJob: await PrintJob.findByPk(printJob.id, {
        include: ['user', 'document', 'payment']
      })
    });
  } catch (error) {
    console.error('Complete print job error:', error);
    res.status(500).json({ error: 'Failed to complete print job' });
  }
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
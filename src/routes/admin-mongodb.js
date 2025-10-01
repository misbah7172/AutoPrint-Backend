const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, PrintJob, Payment } = require('../models/mongodb');
const { authenticateAdmin } = require('../middleware/auth');

const router = express.Router();

// Admin login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // For demo purposes, create a hardcoded admin
    const validAdmins = [
      { username: 'admin', password: 'admin123', role: 'superadmin' },
      { username: 'staff', password: 'staff123', role: 'staff' }
    ];

    const admin = validAdmins.find(a => a.username === username);
    
    if (!admin || password !== admin.password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { 
        adminId: admin.username,
        username: admin.username,
        role: admin.role 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({ 
      token,
      admin: {
        username: admin.username,
        role: admin.role
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Middleware to authenticate admin for all subsequent routes
router.use(authenticateAdmin);

// Dashboard stats
router.get('/dashboard/stats', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      pendingPayments,
      jobsInQueue,
      jobsPrinting,
      completedToday,
      skippedFailed,
      todayRevenue,
      totalStudents,
      activeStudents
    ] = await Promise.all([
      PrintJob.countDocuments({ status: 'pending_payment' }),
      PrintJob.countDocuments({ status: 'queued' }),
      PrintJob.countDocuments({ status: 'printing' }),
      PrintJob.countDocuments({ 
        status: 'printed',
        completedAt: { $gte: today, $lt: tomorrow }
      }),
      PrintJob.countDocuments({ 
        status: { $in: ['error', 'expired'] }
      }),
      PrintJob.aggregate([
        {
          $match: {
            status: 'printed',
            completedAt: { $gte: today, $lt: tomorrow }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ]),
      User.countDocuments(),
      User.countDocuments({ 
        lastLoginAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      })
    ]);

    res.json({
      pendingPayments,
      jobsInQueue,
      jobsPrinting,
      completedToday,
      skippedFailed,
      todayRevenue: todayRevenue[0]?.total || 0,
      totalStudents,
      activeStudents
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// Get current queue
router.get('/queue/current', async (req, res) => {
  try {
    const currentQueue = await PrintJob.find({
      status: { $in: ['queued', 'printing', 'waiting_confirmation'] }
    })
    .populate('userId', 'name email')
    .sort({ serialNumber: 1 })
    .limit(10);

    res.json(currentQueue);
  } catch (error) {
    console.error('Error fetching current queue:', error);
    res.status(500).json({ error: 'Failed to fetch current queue' });
  }
});

// Get full queue
router.get('/queue/full', async (req, res) => {
  try {
    const fullQueue = await PrintJob.find({
      status: { $in: ['queued', 'printing', 'waiting_confirmation'] }
    })
    .populate('userId', 'name email')
    .sort({ serialNumber: 1 });

    res.json(fullQueue);
  } catch (error) {
    console.error('Error fetching full queue:', error);
    res.status(500).json({ error: 'Failed to fetch full queue' });
  }
});

// Get students
router.get('/students', async (req, res) => {
  try {
    const { page = 1, limit = 20, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { studentId: { $regex: search, $options: 'i' } }
      ];
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const students = await User.find(query)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    res.json({ students });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

// Block/unblock user
router.patch('/students/:userId/block', async (req, res) => {
  try {
    const { userId } = req.params;
    const { blocked } = req.body;

    await User.findByIdAndUpdate(userId, { isBlocked: blocked });

    res.json({ 
      message: `User ${blocked ? 'blocked' : 'unblocked'} successfully` 
    });
  } catch (error) {
    console.error('Error blocking/unblocking user:', error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

// Get pending payments
router.get('/payments/pending', async (req, res) => {
  try {
    const pendingPayments = await PrintJob.find({
      status: 'pending_payment'
    }).populate('userId', 'name email');

    res.json(pendingPayments);
  } catch (error) {
    console.error('Error fetching pending payments:', error);
    res.status(500).json({ error: 'Failed to fetch pending payments' });
  }
});

// Verify payment
router.post('/payments/:jobId/verify', async (req, res) => {
  try {
    const { jobId } = req.params;
    const { approve, notes } = req.body;
    const adminUsername = req.admin.username;

    const printJob = await PrintJob.findById(jobId);
    if (!printJob) {
      return res.status(404).json({ error: 'Print job not found' });
    }

    if (approve) {
      // Generate serial number
      const lastJob = await PrintJob.findOne({ serialNumber: { $exists: true } })
        .sort({ serialNumber: -1 });
      const serialNumber = (lastJob?.serialNumber || 0) + 1;

      printJob.status = 'queued';
      printJob.serialNumber = serialNumber;
      printJob.verifiedBy = adminUsername;
      printJob.verifiedAt = new Date();
    } else {
      printJob.status = 'payment_rejected';
      printJob.verifiedBy = adminUsername;
      printJob.verifiedAt = new Date();
    }

    if (notes) {
      printJob.logs.push({
        status: approve ? 'payment_verified' : 'payment_rejected',
        timestamp: new Date(),
        notes,
        adminId: adminUsername
      });
    }

    await printJob.save();

    res.json({ 
      message: approve ? 'Payment verified successfully' : 'Payment rejected' 
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
});

// Skip job
router.post('/queue/:jobId/skip', async (req, res) => {
  try {
    const { jobId } = req.params;
    const adminUsername = req.admin.username;

    const printJob = await PrintJob.findById(jobId);
    if (!printJob) {
      return res.status(404).json({ error: 'Print job not found' });
    }

    printJob.status = 'skipped';
    printJob.logs.push({
      status: 'skipped',
      timestamp: new Date(),
      adminId: adminUsername
    });

    await printJob.save();

    res.json({ message: 'Job skipped successfully' });
  } catch (error) {
    console.error('Error skipping job:', error);
    res.status(500).json({ error: 'Failed to skip job' });
  }
});

// Cancel job
router.delete('/queue/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const adminUsername = req.admin.username;

    const printJob = await PrintJob.findById(jobId);
    if (!printJob) {
      return res.status(404).json({ error: 'Print job not found' });
    }

    printJob.status = 'cancelled';
    printJob.logs.push({
      status: 'cancelled',
      timestamp: new Date(),
      adminId: adminUsername
    });

    await printJob.save();

    res.json({ message: 'Job cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling job:', error);
    res.status(500).json({ error: 'Failed to cancel job' });
  }
});

// Requeue job
router.post('/queue/:jobId/requeue', async (req, res) => {
  try {
    const { jobId } = req.params;
    const adminUsername = req.admin.username;

    const printJob = await PrintJob.findById(jobId);
    if (!printJob) {
      return res.status(404).json({ error: 'Print job not found' });
    }

    // Generate new serial number
    const lastJob = await PrintJob.findOne({ serialNumber: { $exists: true } })
      .sort({ serialNumber: -1 });
    const serialNumber = (lastJob?.serialNumber || 0) + 1;

    printJob.status = 'queued';
    printJob.serialNumber = serialNumber;
    printJob.logs.push({
      status: 'requeued',
      timestamp: new Date(),
      adminId: adminUsername
    });

    await printJob.save();

    res.json({ message: 'Job requeued successfully' });
  } catch (error) {
    console.error('Error requeuing job:', error);
    res.status(500).json({ error: 'Failed to requeue job' });
  }
});

// Force print
router.post('/printer/force-print/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const adminUsername = req.admin.username;

    const printJob = await PrintJob.findById(jobId);
    if (!printJob) {
      return res.status(404).json({ error: 'Print job not found' });
    }

    printJob.status = 'printing';
    printJob.printStartedAt = new Date();
    printJob.logs.push({
      status: 'force_printed',
      timestamp: new Date(),
      adminId: adminUsername
    });

    await printJob.save();

    res.json({ message: 'Job sent to printer' });
  } catch (error) {
    console.error('Error force printing job:', error);
    res.status(500).json({ error: 'Failed to force print job' });
  }
});

// Get printer status
router.get('/printer/status', async (req, res) => {
  try {
    // Mock printer status - in real app, this would connect to actual printer
    const currentJob = await PrintJob.findOne({ status: 'printing' }).populate('userId', 'firstName lastName');
    const queueCount = await PrintJob.countDocuments({ status: 'queued' });
    
    const printerStatus = {
      status: currentJob ? 'printing' : (queueCount > 0 ? 'idle' : 'idle'),
      currentJob: currentJob ? {
        id: currentJob._id,
        fileName: currentJob.fileName,
        studentName: currentJob.userId ? `${currentJob.userId.firstName} ${currentJob.userId.lastName}` : 'Unknown',
        progress: Math.floor(Math.random() * 100), // Mock progress
        startedAt: currentJob.updatedAt
      } : null,
      queueCount,
      paperLevel: Math.floor(Math.random() * 100) + 1, // Mock paper level
      inkLevel: Math.floor(Math.random() * 100) + 1,   // Mock ink level
      lastError: null,
      uptime: Date.now() - (24 * 60 * 60 * 1000) // Mock 24h uptime
    };

    res.json(printerStatus);
  } catch (error) {
    console.error('Error fetching printer status:', error);
    res.status(500).json({ error: 'Failed to fetch printer status' });
  }
});

// Pause printing
router.post('/printer/pause', async (req, res) => {
  try {
    // Mock implementation - in real app, this would control hardware
    res.json({ message: 'Printing paused' });
  } catch (error) {
    console.error('Error pausing printer:', error);
    res.status(500).json({ error: 'Failed to pause printer' });
  }
});

// Resume printing
router.post('/printer/resume', async (req, res) => {
  try {
    // Mock implementation - in real app, this would control hardware
    res.json({ message: 'Printing resumed' });
  } catch (error) {
    console.error('Error resuming printer:', error);
    res.status(500).json({ error: 'Failed to resume printer' });
  }
});

// Cancel current print
router.post('/printer/cancel-current', async (req, res) => {
  try {
    const adminUsername = req.admin.username;
    
    const currentJob = await PrintJob.findOne({ status: 'printing' });
    if (currentJob) {
      currentJob.status = 'cancelled';
      currentJob.logs.push({
        status: 'print_cancelled',
        timestamp: new Date(),
        adminId: adminUsername
      });
      await currentJob.save();
    }

    res.json({ message: 'Current print cancelled' });
  } catch (error) {
    console.error('Error cancelling current print:', error);
    res.status(500).json({ error: 'Failed to cancel current print' });
  }
});

// Get printer status
router.get('/printer/status', async (req, res) => {
  try {
    // Mock printer status - in real app, this would connect to actual printer
    const currentJob = await PrintJob.findOne({ status: 'printing' }).populate('userId', 'name');
    const queueCount = await PrintJob.countDocuments({ status: 'queued' });
    
    const printerStatus = {
      status: currentJob ? 'printing' : (queueCount > 0 ? 'idle' : 'idle'),
      currentJob: currentJob ? {
        id: currentJob._id,
        fileName: currentJob.fileName,
        studentName: currentJob.userId?.name || 'Unknown',
        progress: Math.floor(Math.random() * 100), // Mock progress
        startedAt: currentJob.updatedAt
      } : null,
      queueCount,
      paperLevel: Math.floor(Math.random() * 100) + 1, // Mock paper level
      inkLevel: Math.floor(Math.random() * 100) + 1,   // Mock ink level
      lastError: null,
      uptime: Date.now() - (24 * 60 * 60 * 1000) // Mock 24h uptime
    };

    res.json(printerStatus);
  } catch (error) {
    console.error('Error fetching printer status:', error);
    res.status(500).json({ error: 'Failed to fetch printer status' });
  }
});

module.exports = router;
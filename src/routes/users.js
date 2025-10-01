const express = require('express');
const { User } = require('../models');
const { asyncHandler } = require('../middleware/asyncHandler');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/users/profile
router.get('/profile', asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.user.userId, {
    include: ['documents', 'printJobs', 'payments']
  });

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({ user });
}));

// PUT /api/users/profile
router.put('/profile', asyncHandler(async (req, res) => {
  const { firstName, lastName, studentId } = req.body;
  
  const user = await User.findByPk(req.user.userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  await user.update({
    firstName: firstName || user.firstName,
    lastName: lastName || user.lastName,
    studentId: studentId || user.studentId
  });

  res.json({ message: 'Profile updated successfully', user });
}));

// GET /api/users/balance
router.get('/balance', asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.user.userId);
  res.json({ balance: user.balance });
}));

// POST /api/users/balance/add
router.post('/balance/add', requireRole(['admin']), asyncHandler(async (req, res) => {
  const { userId, amount } = req.body;
  
  const user = await User.findByPk(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const newBalance = parseFloat(user.balance) + parseFloat(amount);
  await user.update({ balance: newBalance });

  res.json({ 
    message: 'Balance updated successfully', 
    balance: newBalance 
  });
}));

module.exports = router;
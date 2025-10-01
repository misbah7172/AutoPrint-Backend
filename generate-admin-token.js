const jwt = require('jsonwebtoken');
require('dotenv').config();

// Create admin token
const adminToken = jwt.sign(
  {
    adminId: 'admin_001',
    username: 'admin',
    role: 'admin'
  },
  process.env.JWT_SECRET || 'your-secret-key',
  { expiresIn: '24h' }
);

console.log('Admin Token:', adminToken);
console.log('\nUse this token in Authorization header as:');
console.log(`Bearer ${adminToken}`);
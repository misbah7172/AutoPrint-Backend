const mongoose = require('mongoose');
const database = require('../../config/database-mongodb');

// Import all models
const User = require('./User');
const Document = require('./Document');
const Payment = require('./Payment');
const PrintJob = require('./PrintJob');

module.exports = {
  database,
  mongoose,
  User,
  Document,
  Payment,
  PrintJob
};
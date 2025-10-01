const crypto = require('crypto');
const { PrintJob } = require('../models');

/**
 * Generate a unique 8-character UPID (Unique Print ID)
 * Format: 4 uppercase letters + 4 digits
 */
const generateUPID = async () => {
  let upid;
  let isUnique = false;
  
  while (!isUnique) {
    // Generate 4 random uppercase letters
    const letters = crypto.randomBytes(2).toString('hex').toUpperCase().replace(/[^A-F]/g, 'A').substring(0, 4);
    
    // Generate 4 random digits
    const digits = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    
    upid = letters + digits;
    
    // Check if UPID is unique
    const existingJob = await PrintJob.findOne({ where: { upid } });
    if (!existingJob) {
      isUnique = true;
    }
  }
  
  return upid;
};

/**
 * Validate UPID format (4 letters + 4 digits)
 */
const validateUPIDFormat = (upid) => {
  const upidRegex = /^[A-Z]{4}\d{4}$/;
  return upidRegex.test(upid);
};

/**
 * Check if UPID exists and is valid for use
 */
const validateUPIDExists = async (upid) => {
  if (!validateUPIDFormat(upid)) {
    return { valid: false, error: 'Invalid UPID format' };
  }
  
  const printJob = await PrintJob.findOne({ 
    where: { upid },
    include: ['user', 'document', 'payment']
  });
  
  if (!printJob) {
    return { valid: false, error: 'UPID not found' };
  }
  
  return { valid: true, printJob };
};

/**
 * Mark UPID as used (single-use enforcement)
 */
const markUPIDUsed = async (upid) => {
  const result = await PrintJob.update(
    { 
      metadata: {
        upidUsed: true,
        upidUsedAt: new Date()
      }
    },
    { 
      where: { 
        upid,
        // Ensure UPID hasn't been used before
        metadata: {
          upidUsed: { [require('sequelize').Op.ne]: true }
        }
      }
    }
  );
  
  return result[0] > 0; // Returns true if update was successful
};

module.exports = {
  generateUPID,
  validateUPIDFormat,
  validateUPIDExists,
  markUPIDUsed
};
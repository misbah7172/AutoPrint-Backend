const mongoose = require('mongoose');

const printJobSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  paymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment'
  },
  jobNumber: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: [
      'uploaded',           // File successfully uploaded
      'pending_payment',    // Waiting for bKash TxID
      'payment_verification', // Admin needs to verify TxID
      'queued',            // Payment verified, job assigned serial number
      'waiting_confirmation', // It's the student's turn, waiting for UPID confirm
      'skipped',           // Student didn't confirm in 5 seconds → moved back in queue
      'printing',          // Raspberry Pi has started the print job
      'printed',           // Successfully printed
      'error',             // Printer failed (paper jam, ink low, etc.)
      'expired',           // Job not completed within X hours → auto-deleted
      'cancelled'          // Job cancelled by user
    ],
    default: 'uploaded'
  },
  serialNumber: {
    type: Number,
    unique: true,
    sparse: true  // Only set when job moves to 'queued' status
  },
  upid: {
    type: String,
    unique: true,
    sparse: true,
    maxlength: 8
  },
  copies: {
    type: Number,
    default: 1,
    min: 1
  },
  paperSize: {
    type: String,
    enum: ['A4', 'A5', 'Letter', 'Legal'],
    default: 'A4'
  },
  orientation: {
    type: String,
    enum: ['portrait', 'landscape'],
    default: 'portrait'
  },
  colorMode: {
    type: String,
    enum: ['color', 'grayscale', 'blackwhite'],
    default: 'blackwhite'
  },
  printQuality: {
    type: String,
    enum: ['draft', 'normal', 'high'],
    default: 'normal'
  },
  doubleSided: {
    type: Boolean,
    default: false
  },
  pageRange: {
    type: String
  },
  totalPages: {
    type: Number,
    min: 1
  },
  costPerPage: {
    type: Number,
    default: 0.05,
    min: 0
  },
  totalCost: {
    type: Number,
    min: 0
  },
  printerName: {
    type: String
  },
  printerId: {
    type: String
  },
  queuePosition: {
    type: Number,
    min: 1
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  startedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  estimatedCompletionTime: {
    type: Date
  },
  errorMessage: {
    type: String
  },
  specialInstructions: {
    type: String
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes for better performance
printJobSchema.index({ userId: 1 });
printJobSchema.index({ documentId: 1 });
printJobSchema.index({ paymentId: 1 });
printJobSchema.index({ status: 1 });
printJobSchema.index({ queuePosition: 1 });
printJobSchema.index({ priority: 1 });
printJobSchema.index({ createdAt: -1 });

// Pre-save middleware to generate job number and UPID
printJobSchema.pre('save', async function(next) {
  if (this.isNew && !this.jobNumber) {
    const count = await this.constructor.countDocuments();
    const year = new Date().getFullYear();
    this.jobNumber = `APR-${year}-${String(count + 1).padStart(3, '0')}`;
  }
  
  if (this.isNew && !this.upid) {
    this.upid = Math.random().toString(36).substring(2, 10).toUpperCase();
  }
  
  // Calculate total cost if not set
  if (this.totalPages && this.costPerPage && !this.totalCost) {
    this.totalCost = this.totalPages * this.costPerPage * this.copies;
  }
  
  next();
});

// Instance method to check if job is in queue
printJobSchema.methods.isInQueue = function() {
  return ['queued', 'waiting_for_confirm', 'printing'].includes(this.status);
};

// Instance method to check if job is completed
printJobSchema.methods.isCompleted = function() {
  return ['completed', 'failed', 'cancelled'].includes(this.status);
};

// Static method to get queue
printJobSchema.statics.getQueue = function() {
  return this.find({ 
    status: { $in: ['queued', 'waiting_for_confirm', 'printing'] } 
  }).sort({ priority: -1, queuePosition: 1, createdAt: 1 });
};

// Static method to find jobs by user
printJobSchema.statics.findByUser = function(userId) {
  return this.find({ userId: userId }).sort({ createdAt: -1 });
};

module.exports = mongoose.model('PrintJob', printJobSchema);
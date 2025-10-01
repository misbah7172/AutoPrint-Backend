const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  originalName: {
    type: String,
    required: true,
    maxlength: 255
  },
  fileName: {
    type: String,
    required: true,
    unique: true
  },
  fileSize: {
    type: Number,
    required: true,
    min: 1
  },
  mimeType: {
    type: String,
    required: true
  },
  s3Key: {
    type: String,
    required: true,
    unique: true
  },
  s3Bucket: {
    type: String,
    required: true
  },
  pageCount: {
    type: Number,
    min: 1
  },
  documentType: {
    type: String,
    enum: ['pdf', 'docx', 'txt', 'image'],
    required: true
  },
  isProcessed: {
    type: Boolean,
    default: false
  },
  processingError: {
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
documentSchema.index({ userId: 1 });
documentSchema.index({ documentType: 1 });
documentSchema.index({ isProcessed: 1 });
documentSchema.index({ createdAt: -1 });

// Virtual for file URL (if needed)
documentSchema.virtual('fileUrl').get(function() {
  return `https://${this.s3Bucket}.s3.amazonaws.com/${this.s3Key}`;
});

// Instance method to check if document is ready for printing
documentSchema.methods.isReadyForPrint = function() {
  return this.isProcessed && !this.processingError && this.pageCount > 0;
};

module.exports = mongoose.model('Document', documentSchema);
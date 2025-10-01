const express = require('express');
const multer = require('multer');
const { Document } = require('../models');
const { asyncHandler } = require('../middleware/asyncHandler');
const { uploadToS3, deleteFromS3 } = require('../services/s3Service');
const { processDocument } = require('../services/documentService');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = (process.env.ALLOWED_FILE_TYPES || 'pdf,doc,docx,txt,jpg,png').split(',');
    const fileExtension = file.originalname.split('.').pop().toLowerCase();
    
    if (allowedTypes.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error(`File type .${fileExtension} not allowed`), false);
    }
  }
});

// POST /api/documents/upload (multipart upload with file type validation)
router.post('/upload', upload.single('document'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  // Additional file type validation
  const allowedMimeTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/jpg'
  ];

  if (!allowedMimeTypes.includes(req.file.mimetype)) {
    return res.status(400).json({ 
      error: 'Invalid file type',
      allowedTypes: ['PDF', 'DOC', 'DOCX', 'TXT', 'JPG', 'PNG']
    });
  }

  try {
    // Upload to S3
    const s3Result = await uploadToS3(req.file, req.user.userId);
    
    // Create document record
    const document = await Document.create({
      userId: req.user.userId,
      originalName: req.file.originalname,
      fileName: s3Result.key,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      s3Key: s3Result.key,
      s3Bucket: s3Result.bucket,
      status: 'processing'
    });

    // Process document asynchronously
    processDocument(document.id).catch(console.error);

    res.status(201).json({
      message: 'Document uploaded successfully',
      document: {
        id: document.id,
        originalName: document.originalName,
        fileSize: document.fileSize,
        mimeType: document.mimeType,
        status: document.status,
        createdAt: document.createdAt
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
}));

// GET /api/documents
router.get('/', asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status } = req.query;
  
  const where = { userId: req.user.userId };
  if (status) where.status = status;

  const documents = await Document.findAndCountAll({
    where,
    limit: parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit),
    order: [['createdAt', 'DESC']]
  });

  res.json({
    documents: documents.rows,
    totalCount: documents.count,
    currentPage: parseInt(page),
    totalPages: Math.ceil(documents.count / parseInt(limit))
  });
}));

// GET /api/documents/:id
router.get('/:id', asyncHandler(async (req, res) => {
  const document = await Document.findOne({
    where: { 
      id: req.params.id, 
      userId: req.user.userId 
    },
    include: ['printJobs']
  });

  if (!document) {
    return res.status(404).json({ error: 'Document not found' });
  }

  res.json({ document });
}));

// DELETE /api/documents/:id
router.delete('/:id', asyncHandler(async (req, res) => {
  const document = await Document.findOne({
    where: { 
      id: req.params.id, 
      userId: req.user.userId 
    }
  });

  if (!document) {
    return res.status(404).json({ error: 'Document not found' });
  }

  // Delete from S3
  try {
    await deleteFromS3(document.s3Key, document.s3Bucket);
  } catch (error) {
    console.error('S3 deletion error:', error);
  }

  // Soft delete the document
  await document.destroy();

  res.json({ message: 'Document deleted successfully' });
}));

module.exports = router;
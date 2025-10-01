const { Document } = require('../models');
const { getSignedUrl } = require('./s3Service');

// Process document after upload
const processDocument = async (documentId) => {
  try {
    const document = await Document.findByPk(documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    // Update status to processing
    await document.update({ status: 'processing' });

    // Simulate document processing (page counting, format validation, etc.)
    // In a real implementation, this would use libraries like pdf-poppler, pdf2pic, etc.
    
    let pageCount = 1;
    let processingError = null;

    try {
      // Mock processing based on file type
      if (document.mimeType === 'application/pdf') {
        // For PDF files, simulate page counting
        pageCount = Math.floor(Math.random() * 10) + 1; // Random 1-10 pages
      } else if (document.mimeType.startsWith('image/')) {
        // Images are single page
        pageCount = 1;
      } else if (document.mimeType.includes('word') || document.mimeType.includes('document')) {
        // Word documents
        pageCount = Math.floor(Math.random() * 5) + 1; // Random 1-5 pages
      }

      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Update document with processing results
      await document.update({
        status: 'ready',
        pageCount: pageCount,
        metadata: {
          ...document.metadata,
          processedAt: new Date().toISOString(),
          processingDuration: 2000
        }
      });

      console.log(`Document ${documentId} processed successfully. Pages: ${pageCount}`);

    } catch (error) {
      processingError = error.message;
      await document.update({
        status: 'error',
        processingError: processingError
      });

      console.error(`Document ${documentId} processing failed:`, error);
    }

  } catch (error) {
    console.error('Document processing error:', error);
  }
};

// Get document download URL
const getDocumentUrl = async (documentId, userId) => {
  const document = await Document.findOne({
    where: { 
      id: documentId, 
      userId: userId 
    }
  });

  if (!document) {
    throw new Error('Document not found');
  }

  // Generate signed URL for download
  const signedUrl = await getSignedUrl(document.s3Key, document.s3Bucket, 3600); // 1 hour expiry
  
  return {
    document,
    downloadUrl: signedUrl
  };
};

// Validate document for printing
const validateDocumentForPrinting = async (documentId, userId) => {
  const document = await Document.findOne({
    where: { 
      id: documentId, 
      userId: userId,
      status: 'ready'
    }
  });

  if (!document) {
    throw new Error('Document not found or not ready for printing');
  }

  if (!document.pageCount || document.pageCount < 1) {
    throw new Error('Document has no printable pages');
  }

  // Check file size limits for printing
  const maxPrintFileSize = 50 * 1024 * 1024; // 50MB
  if (document.fileSize > maxPrintFileSize) {
    throw new Error('Document too large for printing');
  }

  return document;
};

// Get document statistics
const getDocumentStats = async (userId = null) => {
  const where = userId ? { userId } : {};

  const stats = await Document.findAll({
    where,
    attributes: [
      'status',
      [Document.sequelize.fn('COUNT', '*'), 'count'],
      [Document.sequelize.fn('SUM', Document.sequelize.col('fileSize')), 'totalSize']
    ],
    group: ['status'],
    raw: true
  });

  return stats.reduce((acc, stat) => {
    acc[stat.status] = {
      count: parseInt(stat.count),
      totalSize: parseInt(stat.totalSize) || 0
    };
    return acc;
  }, {});
};

module.exports = {
  processDocument,
  getDocumentUrl,
  validateDocumentForPrinting,
  getDocumentStats
};
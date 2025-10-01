const cron = require('node-cron');
const AWS = require('aws-sdk');
const { Document, PrintJob } = require('../models');
const { Op } = require('sequelize');

class DocumentCleanupWorker {
  constructor() {
    this.isRunning = false;
    this.s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION
    });
  }

  start() {
    if (this.isRunning) {
      console.log('Document cleanup worker is already running');
      return;
    }

    console.log('Starting document cleanup worker...');
    this.isRunning = true;

    // Run cleanup every hour
    this.cleanupJob = cron.schedule('0 * * * *', () => {
      this.cleanupDocuments();
    }, {
      scheduled: false
    });

    this.cleanupJob.start();
    console.log('Document cleanup worker started successfully');
  }

  stop() {
    if (!this.isRunning) {
      console.log('Document cleanup worker is not running');
      return;
    }

    console.log('Stopping document cleanup worker...');
    
    if (this.cleanupJob) {
      this.cleanupJob.stop();
    }

    this.isRunning = false;
    console.log('Document cleanup worker stopped');
  }

  async cleanupDocuments() {
    try {
      console.log('Starting document cleanup process...');

      // Find documents that should be cleaned up
      const cleanupThreshold = new Date(Date.now() - this.getRetentionPeriod());

      const documentsToCleanup = await Document.findAll({
        include: [{
          model: PrintJob,
          as: 'printJobs',
          where: {
            [Op.or]: [
              {
                status: 'completed',
                updatedAt: { [Op.lt]: cleanupThreshold }
              },
              {
                status: 'cancelled',
                updatedAt: { [Op.lt]: cleanupThreshold }
              },
              {
                status: 'failed',
                updatedAt: { [Op.lt]: cleanupThreshold }
              }
            ]
          }
        }]
      });

      let cleanedCount = 0;
      let errors = [];

      for (const document of documentsToCleanup) {
        try {
          await this.cleanupDocument(document);
          cleanedCount++;
        } catch (error) {
          console.error(`Failed to cleanup document ${document.id}:`, error);
          errors.push({ documentId: document.id, error: error.message });
        }
      }

      console.log(`Document cleanup completed: ${cleanedCount} documents cleaned, ${errors.length} errors`);

      if (errors.length > 0) {
        console.error('Cleanup errors:', errors);
      }

    } catch (error) {
      console.error('Document cleanup process failed:', error);
    }
  }

  async cleanupDocument(document) {
    try {
      // Delete from S3 if it's an S3 file
      if (document.filePath && document.filePath.includes('s3.amazonaws.com')) {
        await this.deleteFromS3(document.filePath);
      }

      // Update document record to mark as cleaned
      await document.update({
        filePath: null,
        metadata: {
          ...document.metadata,
          cleanedAt: new Date(),
          originalPath: document.filePath
        }
      });

      console.log(`Cleaned up document ${document.id}: ${document.filename}`);

    } catch (error) {
      console.error(`Error cleaning document ${document.id}:`, error);
      throw error;
    }
  }

  async deleteFromS3(filePath) {
    try {
      // Extract bucket and key from S3 URL
      const url = new URL(filePath);
      const pathParts = url.pathname.substring(1).split('/');
      const bucket = process.env.AWS_S3_BUCKET;
      const key = pathParts.join('/');

      const params = {
        Bucket: bucket,
        Key: key
      };

      await this.s3.deleteObject(params).promise();
      console.log(`Deleted S3 object: ${key}`);

    } catch (error) {
      console.error(`Failed to delete S3 object: ${filePath}`, error);
      throw error;
    }
  }

  getRetentionPeriod() {
    // Default retention period: 24 hours after completion
    const hours = process.env.DOCUMENT_RETENTION_HOURS || 24;
    return hours * 60 * 60 * 1000; // Convert to milliseconds
  }

  async manualCleanup(documentId) {
    try {
      const document = await Document.findByPk(documentId, {
        include: ['printJobs']
      });

      if (!document) {
        throw new Error('Document not found');
      }

      // Check if any print job is still active
      const activeJob = document.printJobs.find(job => 
        ['pending', 'queued', 'waiting_for_confirm', 'printing'].includes(job.status)
      );

      if (activeJob) {
        throw new Error('Cannot cleanup document with active print jobs');
      }

      await this.cleanupDocument(document);
      return true;

    } catch (error) {
      console.error('Manual cleanup failed:', error);
      throw error;
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      retentionPeriodHours: process.env.DOCUMENT_RETENTION_HOURS || 24,
      nextCleanup: this.cleanupJob ? this.cleanupJob.nextDate() : null
    };
  }
}

module.exports = DocumentCleanupWorker;
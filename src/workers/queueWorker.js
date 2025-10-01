const cron = require('node-cron');
const { PrintJob, User, Document } = require('../models');
const { Op } = require('sequelize');

class QueueWorker {
  constructor(io) {
    this.io = io;
    this.isRunning = false;
  }

  start() {
    if (this.isRunning) {
      console.log('Queue worker is already running');
      return;
    }

    console.log('Starting queue worker...');
    this.isRunning = true;

    // Monitor queue every 5 seconds for confirmation timeouts
    this.confirmationMonitor = cron.schedule('*/5 * * * * *', () => {
      this.checkConfirmationTimeouts();
    }, {
      scheduled: false
    });

    // Cleanup completed/cancelled jobs every hour
    this.cleanupMonitor = cron.schedule('0 * * * *', () => {
      this.cleanupOldJobs();
    }, {
      scheduled: false
    });

    // Emit queue status updates every 10 seconds
    this.statusUpdater = cron.schedule('*/10 * * * * *', () => {
      this.emitQueueStatus();
    }, {
      scheduled: false
    });

    this.confirmationMonitor.start();
    this.cleanupMonitor.start();
    this.statusUpdater.start();

    console.log('Queue worker started successfully');
  }

  stop() {
    if (!this.isRunning) {
      console.log('Queue worker is not running');
      return;
    }

    console.log('Stopping queue worker...');
    
    if (this.confirmationMonitor) {
      this.confirmationMonitor.stop();
    }
    
    if (this.cleanupMonitor) {
      this.cleanupMonitor.stop();
    }
    
    if (this.statusUpdater) {
      this.statusUpdater.stop();
    }

    this.isRunning = false;
    console.log('Queue worker stopped');
  }

  async checkConfirmationTimeouts() {
    try {
      // Find jobs that have been waiting for confirmation for more than 5 seconds
      const timeoutThreshold = new Date(Date.now() - 5000); // 5 seconds ago

      const timedOutJobs = await PrintJob.findAll({
        where: {
          status: 'waiting_for_confirm',
          updatedAt: {
            [Op.lt]: timeoutThreshold
          }
        },
        include: ['user']
      });

      for (const job of timedOutJobs) {
        console.log(`Job ${job.upid} confirmation timeout - moving down in queue`);
        
        // Move job down in queue
        await this.moveJobDown(job);
        
        // Emit timeout notification
        this.io.to(`user_${job.userId}`).emit('confirmationTimeout', {
          printJobId: job.id,
          upid: job.upid,
          newQueuePosition: job.queuePosition,
          message: 'Your print job was moved down in queue due to confirmation timeout'
        });

        // Emit general queue update
        this.io.emit('queueUpdate', {
          type: 'timeout',
          printJobId: job.id,
          upid: job.upid
        });
      }

    } catch (error) {
      console.error('Error checking confirmation timeouts:', error);
    }
  }

  async moveJobDown(job) {
    try {
      // Get next job in queue
      const nextJob = await PrintJob.findOne({
        where: {
          status: 'queued',
          queuePosition: job.queuePosition + 1
        }
      });

      if (nextJob) {
        // Swap positions
        await job.update({ 
          queuePosition: nextJob.queuePosition,
          status: 'queued' // Reset to queued status
        });
        
        await nextJob.update({ 
          queuePosition: job.queuePosition 
        });
        
        console.log(`Swapped positions: Job ${job.upid} (pos ${nextJob.queuePosition}) <-> Job ${nextJob.upid} (pos ${job.queuePosition})`);
      } else {
        // Just reset status if no next job
        await job.update({ 
          status: 'queued'
        });
      }
    } catch (error) {
      console.error('Error moving job down:', error);
    }
  }

  async cleanupOldJobs() {
    try {
      const cleanupThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

      // Find completed or cancelled jobs older than 24 hours
      const oldJobs = await PrintJob.findAll({
        where: {
          status: {
            [Op.in]: ['completed', 'cancelled', 'failed']
          },
          updatedAt: {
            [Op.lt]: cleanupThreshold
          }
        },
        include: ['document']
      });

      let cleanedCount = 0;

      for (const job of oldJobs) {
        // Delete associated document file if it exists
        if (job.document && job.document.filePath) {
          try {
            // Here you would delete from S3 or local storage
            console.log(`Would delete file: ${job.document.filePath}`);
          } catch (fileError) {
            console.error(`Failed to delete file ${job.document.filePath}:`, fileError);
          }
        }

        // Optionally keep the record but remove sensitive data
        // Or completely delete old records
        await job.update({
          metadata: {
            ...job.metadata,
            cleanedAt: new Date()
          }
        });

        cleanedCount++;
      }

      if (cleanedCount > 0) {
        console.log(`Cleaned up ${cleanedCount} old print jobs`);
      }

    } catch (error) {
      console.error('Error during job cleanup:', error);
    }
  }

  async emitQueueStatus() {
    try {
      // Get current queue status
      const queuedJobs = await PrintJob.findAll({
        where: {
          status: {
            [Op.in]: ['queued', 'waiting_for_confirm', 'printing']
          }
        },
        include: ['user'],
        order: [['queuePosition', 'ASC']]
      });

      const queueStatus = {
        totalJobs: queuedJobs.length,
        currentJob: queuedJobs.find(job => job.status === 'printing') || null,
        waitingJobs: queuedJobs.filter(job => job.status !== 'printing'),
        updatedAt: new Date()
      };

      // Emit to all connected clients
      this.io.emit('queueStatus', queueStatus);

      // Emit personalized updates to users
      for (const job of queuedJobs) {
        this.io.to(`user_${job.userId}`).emit('myJobStatus', {
          printJobId: job.id,
          upid: job.upid,
          status: job.status,
          queuePosition: job.queuePosition,
          estimatedWaitTime: this.calculateWaitTime(job.queuePosition)
        });
      }

    } catch (error) {
      console.error('Error emitting queue status:', error);
    }
  }

  calculateWaitTime(position) {
    // Rough estimate: 2 minutes per job ahead in queue
    const avgJobTime = 2; // minutes
    return Math.max(0, (position - 1) * avgJobTime);
  }

  // Manual trigger functions for testing/admin use
  async triggerTimeout(jobId) {
    try {
      const job = await PrintJob.findByPk(jobId);
      if (job && job.status === 'waiting_for_confirm') {
        await this.moveJobDown(job);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error triggering timeout:', error);
      return false;
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      monitors: {
        confirmationMonitor: this.confirmationMonitor ? this.confirmationMonitor.running : false,
        cleanupMonitor: this.cleanupMonitor ? this.cleanupMonitor.running : false,
        statusUpdater: this.statusUpdater ? this.statusUpdater.running : false
      }
    };
  }
}

module.exports = QueueWorker;
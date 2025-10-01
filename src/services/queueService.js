const { PrintJob, User, Document, sequelize } = require('../models');
const { Op } = require('sequelize');

/**
 * Assign queue position to a print job atomically
 */
const assignQueuePosition = async (printJobId) => {
  return await sequelize.transaction(async (t) => {
    // Get the maximum queue position
    const maxPosition = await PrintJob.max('queuePosition', {
      where: { status: ['queued', 'waiting_for_confirm', 'printing'] },
      transaction: t
    }) || 0;
    
    // Assign next position
    const newPosition = maxPosition + 1;
    
    await PrintJob.update(
      { 
        queuePosition: newPosition,
        status: 'queued'
      },
      { 
        where: { id: printJobId },
        transaction: t
      }
    );
    
    return newPosition;
  });
};

/**
 * Move job down in queue by specified positions
 */
const moveJobDown = async (printJobId, positions = 5) => {
  return await sequelize.transaction(async (t) => {
    const job = await PrintJob.findByPk(printJobId, { transaction: t });
    if (!job || !job.queuePosition) {
      throw new Error('Job not found or not in queue');
    }
    
    const currentPosition = job.queuePosition;
    const newPosition = currentPosition + positions;
    
    // Update the job's position
    await PrintJob.update(
      { queuePosition: newPosition },
      { 
        where: { id: printJobId },
        transaction: t
      }
    );
    
    // Compact queue to fill the gap
    await compactQueue(t);
    
    return newPosition;
  });
};

/**
 * Compact queue positions to eliminate gaps
 */
const compactQueue = async (transaction = null) => {
  const executeWithTransaction = async (t) => {
    // Get all queued jobs ordered by position
    const jobs = await PrintJob.findAll({
      where: { 
        status: ['queued', 'waiting_for_confirm', 'printing'],
        queuePosition: { [Op.not]: null }
      },
      order: [['queuePosition', 'ASC']],
      transaction: t
    });
    
    // Reassign positions sequentially
    for (let i = 0; i < jobs.length; i++) {
      const newPosition = i + 1;
      if (jobs[i].queuePosition !== newPosition) {
        await PrintJob.update(
          { queuePosition: newPosition },
          { 
            where: { id: jobs[i].id },
            transaction: t
          }
        );
      }
    }
    
    return jobs.length;
  };
  
  if (transaction) {
    return await executeWithTransaction(transaction);
  } else {
    return await sequelize.transaction(executeWithTransaction);
  }
};

/**
 * Get user's position in queue
 */
const getUserQueuePosition = async (userId) => {
  const userJob = await PrintJob.findOne({
    where: {
      userId,
      status: ['queued', 'waiting_for_confirm', 'printing'],
      queuePosition: { [Op.not]: null }
    },
    order: [['queuePosition', 'ASC']]
  });
  
  if (!userJob) {
    return null;
  }
  
  return {
    position: userJob.queuePosition,
    jobId: userJob.id,
    upid: userJob.upid,
    status: userJob.status
  };
};

/**
 * Get next few jobs in queue
 */
const getNextJobsInQueue = async (limit = 5, fromPosition = 1) => {
  const jobs = await PrintJob.findAll({
    where: {
      status: ['queued', 'waiting_for_confirm', 'printing'],
      queuePosition: { 
        [Op.gte]: fromPosition,
        [Op.not]: null 
      }
    },
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName', 'studentId']
      },
      {
        model: Document,
        as: 'document',
        attributes: ['id', 'originalName', 'pageCount']
      }
    ],
    order: [['queuePosition', 'ASC']],
    limit
  });
  
  return jobs.map(job => ({
    id: job.id,
    upid: job.upid,
    position: job.queuePosition,
    status: job.status,
    user: {
      name: `${job.user.firstName} ${job.user.lastName}`,
      studentId: job.user.studentId
    },
    document: {
      name: job.document.originalName,
      pages: job.document.pageCount
    },
    printOptions: job.printOptions,
    estimatedTime: calculateEstimatedTime(job.printOptions, job.document.pageCount)
  }));
};

/**
 * Get current job (first in queue)
 */
const getCurrentJob = async () => {
  return await PrintJob.findOne({
    where: {
      status: ['queued', 'waiting_for_confirm', 'printing'],
      queuePosition: { [Op.not]: null }
    },
    include: ['user', 'document'],
    order: [['queuePosition', 'ASC']]
  });
};

/**
 * Set job as waiting for confirmation
 */
const setJobWaitingForConfirm = async (jobId) => {
  return await PrintJob.update(
    { 
      status: 'waiting_for_confirm',
      metadata: {
        waitingStartTime: new Date()
      }
    },
    { where: { id: jobId } }
  );
};

/**
 * Calculate estimated printing time based on options and pages
 */
const calculateEstimatedTime = (printOptions, pageCount) => {
  const baseTimePerPage = 30; // seconds per page
  let multiplier = 1;
  
  if (printOptions.color) multiplier *= 1.5;
  if (printOptions.doubleSided) multiplier *= 1.2;
  if (printOptions.quality === 'high') multiplier *= 1.3;
  
  const totalPages = pageCount * (printOptions.copies || 1);
  const estimatedSeconds = totalPages * baseTimePerPage * multiplier;
  
  return Math.ceil(estimatedSeconds);
};

/**
 * Remove job from queue (completed, cancelled, etc.)
 */
const removeFromQueue = async (jobId) => {
  return await sequelize.transaction(async (t) => {
    await PrintJob.update(
      { queuePosition: null },
      { 
        where: { id: jobId },
        transaction: t
      }
    );
    
    // Compact queue after removal
    await compactQueue(t);
  });
};

module.exports = {
  assignQueuePosition,
  moveJobDown,
  compactQueue,
  getUserQueuePosition,
  getNextJobsInQueue,
  getCurrentJob,
  setJobWaitingForConfirm,
  calculateEstimatedTime,
  removeFromQueue
};
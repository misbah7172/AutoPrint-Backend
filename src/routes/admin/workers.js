const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/asyncHandler');

// GET /api/admin/workers/status - Get status of all workers
router.get('/status', authenticate, requireRole(['admin']), asyncHandler(async (req, res) => {
  const queueWorker = req.app.get('queueWorker');
  const documentCleanupWorker = req.app.get('documentCleanupWorker');

  res.json({
    queueWorker: queueWorker ? queueWorker.getStatus() : { isRunning: false },
    documentCleanupWorker: documentCleanupWorker ? documentCleanupWorker.getStatus() : { isRunning: false },
    serverUptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    timestamp: new Date()
  });
}));

// POST /api/admin/workers/queue/start - Start queue worker
router.post('/queue/start', authenticate, requireRole(['admin']), asyncHandler(async (req, res) => {
  const queueWorker = req.app.get('queueWorker');
  
  if (!queueWorker) {
    return res.status(500).json({ error: 'Queue worker not initialized' });
  }

  queueWorker.start();
  res.json({ message: 'Queue worker started', status: queueWorker.getStatus() });
}));

// POST /api/admin/workers/queue/stop - Stop queue worker
router.post('/queue/stop', authenticate, requireRole(['admin']), asyncHandler(async (req, res) => {
  const queueWorker = req.app.get('queueWorker');
  
  if (!queueWorker) {
    return res.status(500).json({ error: 'Queue worker not initialized' });
  }

  queueWorker.stop();
  res.json({ message: 'Queue worker stopped', status: queueWorker.getStatus() });
}));

// POST /api/admin/workers/cleanup/start - Start document cleanup worker
router.post('/cleanup/start', authenticate, requireRole(['admin']), asyncHandler(async (req, res) => {
  const documentCleanupWorker = req.app.get('documentCleanupWorker');
  
  if (!documentCleanupWorker) {
    return res.status(500).json({ error: 'Document cleanup worker not initialized' });
  }

  documentCleanupWorker.start();
  res.json({ message: 'Document cleanup worker started', status: documentCleanupWorker.getStatus() });
}));

// POST /api/admin/workers/cleanup/stop - Stop document cleanup worker
router.post('/cleanup/stop', authenticate, requireRole(['admin']), asyncHandler(async (req, res) => {
  const documentCleanupWorker = req.app.get('documentCleanupWorker');
  
  if (!documentCleanupWorker) {
    return res.status(500).json({ error: 'Document cleanup worker not initialized' });
  }

  documentCleanupWorker.stop();
  res.json({ message: 'Document cleanup worker stopped', status: documentCleanupWorker.getStatus() });
}));

// POST /api/admin/workers/cleanup/manual - Manually cleanup a document
router.post('/cleanup/manual', authenticate, requireRole(['admin']), asyncHandler(async (req, res) => {
  const { documentId } = req.body;
  
  if (!documentId) {
    return res.status(400).json({ error: 'Document ID is required' });
  }

  const documentCleanupWorker = req.app.get('documentCleanupWorker');
  
  if (!documentCleanupWorker) {
    return res.status(500).json({ error: 'Document cleanup worker not initialized' });
  }

  try {
    await documentCleanupWorker.manualCleanup(documentId);
    res.json({ message: `Document ${documentId} cleaned up successfully` });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}));

// POST /api/admin/workers/queue/timeout - Manually trigger timeout for a job
router.post('/queue/timeout', authenticate, requireRole(['admin']), asyncHandler(async (req, res) => {
  const { jobId } = req.body;
  
  if (!jobId) {
    return res.status(400).json({ error: 'Job ID is required' });
  }

  const queueWorker = req.app.get('queueWorker');
  
  if (!queueWorker) {
    return res.status(500).json({ error: 'Queue worker not initialized' });
  }

  try {
    const success = await queueWorker.triggerTimeout(jobId);
    if (success) {
      res.json({ message: `Job ${jobId} timeout triggered successfully` });
    } else {
      res.status(400).json({ error: 'Job not found or not in waiting_for_confirm status' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}));

module.exports = router;
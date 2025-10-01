const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const documentRoutes = require('./routes/documents');
const printJobRoutes = require('./routes/printJobs');
const paymentRoutes = require('./routes/payments');
const adminRoutes = require('./routes/admin');
const queueRoutes = require('./routes/queue');
const printRoutes = require('./routes/print');

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const { authenticate } = require('./middleware/auth');

// Import database
const { sequelize } = require('./models');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps)
      if (!origin) return callback(null, true);
      
      // Allow all origins if CORS_ORIGIN is '*' or in development
      const corsOrigins = process.env.CORS_ORIGIN 
        ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
        : ['*'];
        
      if (corsOrigins.includes('*') || process.env.NODE_ENV === 'development') {
        return callback(null, true);
      }
      
      // Check if origin is in allowed list
      if (corsOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;

// Make io available to routes
app.set('io', io);

// Initialize workers
const QueueWorker = require('./workers/queueWorker');
const DocumentCleanupWorker = require('./workers/documentCleanupWorker');

const queueWorker = new QueueWorker(io);
const documentCleanupWorker = new DocumentCleanupWorker();

app.set('queueWorker', queueWorker);
app.set('documentCleanupWorker', documentCleanupWorker);

// Security middleware
app.use(helmet());

// CORS configuration - flexible for deployment
const corsOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
  : ['*'];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow all origins in development or if CORS_ORIGIN is '*'
    if (corsOrigins.includes('*') || process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    // Check if origin is in allowed list
    if (corsOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', authenticate, userRoutes);
app.use('/api/documents', authenticate, documentRoutes);
app.use('/api/print-jobs', authenticate, printJobRoutes);
app.use('/api/payments', authenticate, paymentRoutes);
app.use('/api/admin', authenticate, adminRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/print', printRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    method: req.method,
    url: req.originalUrl
  });
});

// Error handling middleware
app.use(errorHandler);

// Database connection and server startup
const startServer = async () => {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');

    // Update database schema with new columns
    if (process.env.NODE_ENV === 'production') {
      try {
        const updateSchema = require('../update-schema');
        await updateSchema();
        console.log('✅ Database schema updated successfully.');
        
        // Create admin user
        const createAdminUser = require('../create-admin-user');
        await createAdminUser();
        console.log('✅ Admin user initialization completed.');
      } catch (error) {
        console.log('ℹ️ Schema update or admin creation not needed:', error.message);
      }
    }

    // Sync database models (use { force: false } in production)
    if (process.env.NODE_ENV !== 'production') {
      await sequelize.sync({ alter: true });
      console.log('✅ Database models synchronized.');
    }

    // Socket.IO authentication and connection handling
    const jwt = require('jsonwebtoken');
    
    io.use((socket, next) => {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.userId;
        socket.role = decoded.role;
        next();
      } catch (error) {
        console.error('Socket authentication error:', error);
        next(new Error('Invalid authentication token'));
      }
    });

    io.on('connection', (socket) => {
      console.log(`User ${socket.userId} connected (${socket.role})`);
      
      // Join user-specific room for personalized updates
      socket.join(`user_${socket.userId}`);
      
      // Join role-specific rooms
      socket.join(`role_${socket.role}`);
      
      // Send current queue status on connection
      socket.emit('connectionSuccess', {
        userId: socket.userId,
        role: socket.role,
        connectedAt: new Date()
      });

      socket.on('disconnect', () => {
        console.log(`User ${socket.userId} disconnected`);
      });

      // Handle user requesting current status
      socket.on('requestQueueStatus', async () => {
        try {
          await queueWorker.emitQueueStatus();
        } catch (error) {
          socket.emit('error', { message: 'Failed to get queue status' });
        }
      });
    });

    // Start server
    server.listen(PORT, () => {
      console.log(`🚀 AutoPrint Backend server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
      console.log(`🔌 Socket.IO enabled for real-time updates`);
    });

    // Start workers
    queueWorker.start();
    documentCleanupWorker.start();

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down gracefully...');
      queueWorker.stop();
      documentCleanupWorker.stop();
      server.close(() => {
        sequelize.close();
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ Unable to start server:', error);
    process.exit(1);
  }
};

// Start the server if this file is executed directly
if (require.main === module) {
  startServer();
}

module.exports = app;
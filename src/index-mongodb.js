const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth-mongodb');
const userRoutes = require('./routes/user-mongodb');
const paymentRoutes = require('./routes/payment-mongodb');
const printRoutes = require('./routes/print-mongodb');
const adminRoutes = require('./routes/admin-mongodb');
const queueRoutes = require('./routes/queue');

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const { authenticate } = require('./middleware/auth');

// Import MongoDB connection
const db = require('./config/database-mongodb');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins for mobile apps
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  }
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: false,
}));
app.use(compression());
app.use(limiter);

// CORS configuration
app.use(cors({
  origin: "*", // Allow all origins for mobile apps
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
}));

// Logging middleware
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/print', printRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/queue', queueRoutes);

// ESP32 Kiosk API
app.use('/api/kiosk', require('./routes/kiosk'));

// Students API (for kiosk compatibility)
app.use('/api/students', require('./routes/students'));

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);

  socket.on('join-queue', (userId) => {
    socket.join(`user-${userId}`);
    console.log(`👤 User ${userId} joined their personal queue room`);
  });

  socket.on('join-admin', () => {
    socket.join('admin');
    console.log('👨‍💼 Admin joined admin room');
  });

  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    method: req.method,
    path: req.originalUrl
  });
});

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    console.log('🚀 Starting AutoPrint Server...');
    
    // Connect to MongoDB
    await db.connect();
    console.log('✅ MongoDB connected successfully');

    // Start the server
    server.listen(PORT, () => {
      console.log(`🌟 AutoPrint Server running on port ${PORT}`);
      console.log(`🔗 API available at: http://localhost:${PORT}/api`);
      console.log(`❤️ Health check: http://localhost:${PORT}/api/health`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('📱 CORS enabled for development origins');
        console.log('🔧 Morgan logging enabled');
      }
    });

    // Handle server shutdown gracefully
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down server...');
      await db.disconnect();
      console.log('📡 MongoDB connection closed');
      server.close(() => {
        console.log('🔴 Server stopped');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ Unable to start server:', error);
    process.exit(1);
  }
}

// Make io available to routes
app.set('io', io);

// Start the server
if (require.main === module) {
  startServer();
}

module.exports = { app, server, io };
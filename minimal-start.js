console.log('🚀 Starting AutoPrint backend in ULTRA-MINIMAL mode...');
console.log('📍 Environment:', process.env.NODE_ENV || 'development');
console.log('🌐 Port:', process.env.PORT || 3000);
console.log('⏰ Start time:', new Date().toISOString());

// Most basic Express server possible
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

// Basic middleware
app.use(express.json({ limit: '1mb' }));

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: '✅ AutoPrint Backend is LIVE!', 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0-minimal'
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    uptime: process.uptime(),
    timestamp: new Date().toISOString() 
  });
});

// Status endpoint
app.get('/status', (req, res) => {
  res.json({
    service: 'autoprint-backend',
    status: 'running',
    environment: process.env.NODE_ENV || 'development',
    port: port,
    timestamp: new Date().toISOString()
  });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`🎉 AutoPrint backend successfully started on port ${port}`);
  console.log(`📱 Service URL: http://localhost:${port}`);
  console.log('✅ Ready to accept connections!');
});
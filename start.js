#!/usr/bin/env node

/**
 * Simple production startup script for AutoPrint Backend
 */

console.log('🚀 Starting AutoPrint Backend...');
console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`🔌 Port: ${process.env.PORT || 3000}`);

// Start the main application directly
require('./src/index');
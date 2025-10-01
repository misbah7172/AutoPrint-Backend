#!/usr/bin/env node

/**
 * Ultra-simple startup script - bypasses all complex initialization
 */

console.log('🚀 Starting AutoPrint Backend (Simple Mode)...');
console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`🔌 Port: ${process.env.PORT || 3000}`);

// Start the server directly without any database checks
console.log('🌟 Starting server...');
require('./src/index');
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/health',
  method: 'GET'
};

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('✅ Health check response:', data);
    console.log('📊 Status code:', res.statusCode);
  });
});

req.on('error', (error) => {
  console.error('❌ Health check failed:', error.message);
});

req.end();
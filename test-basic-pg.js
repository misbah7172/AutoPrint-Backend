const { Client } = require('pg');

async function testBasicConnection() {
  console.log('🔗 Testing basic pg connection to Neon...');
  
  const client = new Client({
    connectionString: 'postgresql://neondb_owner:npg_8uexFD5ArTqV@ep-divine-credit-ad52ykm7.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require',
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  });

  try {
    console.log('Connecting...');
    await client.connect();
    console.log('✅ Connected successfully!');
    
    const result = await client.query('SELECT NOW(), version();');
    console.log('📅 Current time:', result.rows[0].now);
    console.log('🐘 PostgreSQL version:', result.rows[0].version);
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('Error code:', error.code);
  } finally {
    try {
      await client.end();
      console.log('🔌 Connection closed');
    } catch (e) {
      // Ignore close errors
    }
  }
}

testBasicConnection();
const { Client } = require('pg');

// Test different connection configurations
const configs = [
  // Direct connection without SSL
  {
    host: 'ep-divine-credit-ad52ykm7.c-2.us-east-1.aws.neon.tech',
    port: 5432,
    database: 'neondb',
    user: 'neondb_owner',
    password: 'npg_8uexFD5ArTqV',
    ssl: false
  },
  // Direct connection with SSL
  {
    host: 'ep-divine-credit-ad52ykm7.c-2.us-east-1.aws.neon.tech',
    port: 5432,
    database: 'neondb',
    user: 'neondb_owner',
    password: 'npg_8uexFD5ArTqV',
    ssl: {
      rejectUnauthorized: false
    }
  },
  // Connection string format
  {
    connectionString: 'postgresql://neondb_owner:npg_8uexFD5ArTqV@ep-divine-credit-ad52ykm7.c-2.us-east-1.aws.neon.tech/neondb',
    ssl: false
  },
  // Connection string with SSL
  {
    connectionString: 'postgresql://neondb_owner:npg_8uexFD5ArTqV@ep-divine-credit-ad52ykm7.c-2.us-east-1.aws.neon.tech/neondb',
    ssl: {
      rejectUnauthorized: false
    }
  }
];

async function testConnection() {
  for (let i = 0; i < configs.length; i++) {
    const config = configs[i];
    console.log(`\n🔧 Testing configuration ${i + 1}:`);
    console.log(JSON.stringify(config, null, 2));
    
    const client = new Client(config);
    
    try {
      await client.connect();
      console.log('✅ Connection successful!');
      
      const result = await client.query('SELECT NOW()');
      console.log('🕐 Server time:', result.rows[0].now);
      
      await client.end();
      console.log('🎯 Found working configuration!');
      break;
      
    } catch (error) {
      console.log('❌ Connection failed:', error.message);
      try {
        await client.end();
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }
}

testConnection();
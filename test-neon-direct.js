const { Sequelize } = require('sequelize');

// Test direct connection to Neon
const sequelize = new Sequelize('postgresql://neondb_owner:npg_8uexFD5ArTqV@ep-divine-credit-ad52ykm7.c-2.us-east-1.aws.neon.tech/neondb', {
  dialect: 'postgres',
  logging: console.log,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

async function testDirectConnection() {
  try {
    console.log('🔗 Testing direct connection to Neon database...');
    
    await sequelize.authenticate();
    console.log('✅ Connection has been established successfully!');
    
    // Try to show some basic database info
    const [results] = await sequelize.query('SELECT version();');
    console.log('📊 Database version:', results[0].version);
    
    // Show current database name
    const [dbResults] = await sequelize.query('SELECT current_database();');
    console.log('🗄️ Current database:', dbResults[0].current_database);
    
    // Check if any tables exist
    const [tables] = await sequelize.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';");
    console.log('📋 Existing tables:', tables.length ? tables.map(t => t.table_name) : 'No tables found');
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    
    // Check if it's a network issue
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      console.log('🔧 This appears to be a network connectivity issue.');
      console.log('   - Check if you have internet access');
      console.log('   - Verify the database URL is correct');
      console.log('   - Check if your firewall is blocking the connection');
    }
    
    // Check if it's an authentication issue
    if (error.code === 'EAUTH' || error.message.includes('authentication')) {
      console.log('🔐 This appears to be an authentication issue.');
      console.log('   - Verify the username and password in the URL');
      console.log('   - Check if the database credentials are still valid');
    }
  } finally {
    await sequelize.close();
    console.log('📡 Connection closed');
  }
}

testDirectConnection();
const { sequelize } = require('./src/models');

async function testConnection() {
  try {
    console.log('Testing database connection...');
    console.log('Database URL:', sequelize.config.url || 'Using individual config');
    
    await sequelize.authenticate();
    console.log('✅ Connection has been established successfully.');
    
    // Try to show some basic database info
    const [results] = await sequelize.query('SELECT version();');
    console.log('Database version:', results[0].version);
    
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error.message);
    console.error('Error details:', error);
  } finally {
    await sequelize.close();
  }
}

testConnection();
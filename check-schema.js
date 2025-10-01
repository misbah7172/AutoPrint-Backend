const { Sequelize } = require('sequelize');
const dbConfig = require('./src/config/database.js');

const config = dbConfig.production;
const sequelize = new Sequelize(config.database, config.username, config.password, {
  host: config.host,
  port: config.port,
  dialect: config.dialect,
  dialectOptions: config.dialectOptions,
  logging: false
});

async function checkSchema() {
  try {
    await sequelize.authenticate();
    console.log('🔍 Checking printjobs table schema...');
    
    const [results] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'printjobs' 
      ORDER BY column_name;
    `);
    
    console.log('\n📋 PrintJob table columns:');
    results.forEach(col => {
      console.log(`- ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
    
    await sequelize.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkSchema();
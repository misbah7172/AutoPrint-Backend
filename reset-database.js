const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: console.log,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  }
});

async function resetDatabase() {
  try {
    console.log('🔗 Connecting to NeonDB...');
    await sequelize.authenticate();
    console.log('✅ Connected successfully');

    console.log('🗑️ Dropping all existing tables and indexes...');
    
    // First, get all table names
    const [tables] = await sequelize.query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public' AND tablename NOT LIKE 'pg_%'
    `);
    
    console.log(`Found ${tables.length} tables to drop`);
    
    // Drop all tables
    for (const table of tables) {
      try {
        await sequelize.query(`DROP TABLE IF EXISTS "${table.tablename}" CASCADE;`);
        console.log(`✅ Dropped table: ${table.tablename}`);
      } catch (error) {
        console.log(`⚠️ Error dropping ${table.tablename}: ${error.message}`);
      }
    }
    
    // Drop any remaining indexes
    const [indexes] = await sequelize.query(`
      SELECT indexname FROM pg_indexes 
      WHERE schemaname = 'public' AND indexname NOT LIKE 'pg_%'
    `);
    
    for (const index of indexes) {
      try {
        await sequelize.query(`DROP INDEX IF EXISTS "${index.indexname}" CASCADE;`);
        console.log(`✅ Dropped index: ${index.indexname}`);
      } catch (error) {
        console.log(`⚠️ Error dropping index ${index.indexname}: ${error.message}`);
      }
    }

    console.log('🎯 Database reset completed!');
    console.log('🔧 Ready for fresh migrations');

  } catch (error) {
    console.error('❌ Database reset failed:', error);
  } finally {
    await sequelize.close();
  }
}

resetDatabase();